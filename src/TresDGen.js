class TresDGen {

    run(gData, id) {
        gData.links.forEach(link => {
            const a = gData.nodes.find(obj => {
                return obj.id === link.source
            });
            const b = gData.nodes.find(obj => {
                return obj.id === link.target
            });
            !a.neighbors && (a.neighbors = []);
            !b.neighbors && (b.neighbors = []);
            a.neighbors.push(b);
            b.neighbors.push(a);

            !a.links && (a.links = []);
            !b.links && (b.links = []);
            a.links.push(link);
            b.links.push(link);
        });

        const highlightNodes = new Set();
        const highlightLinks = new Set();
        let hoverNode = null;
        let activeTooltip = false;
        let activeElement = null;
        let collapse = false;

        const Graph = ForceGraph3D()
            (document.getElementById(id))
            .graphData(gData)
            .nodeAutoColorBy('id')
            .nodeRelSize(2)
            .linkWidth(link => highlightLinks.has(link) ? 1 : 1)
            .linkDirectionalParticles(link => highlightLinks.has(link) ? 4 : 0)
            .linkDirectionalParticleWidth(2)
            //.linkColor(link => highlightLinks.has(link) ? 'rgba(255,0,0,0.8)' : 'rgba(255,255,255,0.8)')
            .linkCurvature(0.2)
            .linkCurveRotation(0)
            .linkDirectionalArrowLength(3.5)
            .linkDirectionalArrowRelPos(1)
            .linkAutoColorBy(d => gData.nodes.find(obj => {
                return obj.id === d.source
            }).id)
            //.nodeThreeObjectExtend(true)
            .nodeThreeObject(node => {
                const sprite = new SpriteText(node.id);
                //sprite.material.depthWrite = true;
                sprite.color = 'rgba(255,255,255,1)';
                sprite.backgroundColor = 'rgba(0,0,0,1)';
                sprite.textHeight = 3;
                return sprite;
            })
            //.linkThreeObjectExtend(true)
            //.linkThreeObject(link => {
            //  const sprite = new SpriteText(`${link.name}`);
            //  sprite.color = 'lightgrey';
            //  sprite.textHeight = 1.5;
            //  return sprite;
            //})
            //.linkPositionUpdate((sprite, { start, end }) => {
            //  const middlePos = Object.assign(...['x', 'y', 'z'].map(c => ({
            //    [c]: start[c] + (end[c] - start[c]) / 2 // calc middle point
            //  })));
            //  Object.assign(sprite.position, middlePos);
            //})
            .onNodeHover(async (node) => {
                // no state change
                if ((!node && !highlightNodes.size) || (node && hoverNode === node)) return;

                highlightNodes.clear();
                highlightLinks.clear();
                if (node) {
                    if (activeElement !== node.p31) $(".wikidata_tooltip").remove();
                    activeElement = node.p31;
                    highlightNodes.add(node);
                    if (node.neighbors) node.neighbors.forEach(neighbor => highlightNodes.add(neighbor));
                    if (node.links) node.links.forEach(link => highlightLinks.add(link));
                    if (node.p31 && !activeTooltip) {
                        activeTooltip = true;
                        let endpoint = "https://www.wikidata.org/w/"
                        let data = await checkEntity(node.p31, endpoint)
                        let posX = 0,
                            posY = 0 + $(window).scrollTop();
                        loadTooltip(data, node.p31, posX, posY);
                        activeTooltip = false;
                    }
                }

                hoverNode = node || null;

                updateHighlight();
            })
            .onLinkHover(async (link) => {
                highlightNodes.clear();
                highlightLinks.clear();

                if (link) {
                    if (activeElement !== link.name) $(".wikidata_tooltip").remove();
                    highlightLinks.add(link);
                    activeElement = link.name;
                    highlightNodes.add(link.source);
                    highlightNodes.add(link.target);
                    if (link.name && !activeTooltip) {
                        activeTooltip = true;
                        let endpoint = "https://www.wikidata.org/w/"
                        let data = await checkEntity(link.name, endpoint)
                        let posX = 0,
                            posY = 0 + $(window).scrollTop();
                        loadTooltip(data, link.name, posX, posY);
                        activeTooltip = false;
                    }
                }

                updateHighlight();
            })
            .onNodeClick(node => {
                const distance = 120;
                const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

                Graph.cameraPosition({
                        x: node.x * distRatio,
                        y: node.y * distRatio,
                        z: node.z * distRatio
                    },
                    node,
                    3000
                );
            })
            .onNodeRightClick(node => {

                if (!collapse) {
                    let visibleNodes = [];
                    node.neighbors.forEach(node => {
                        let newNode = {
                            id: node.id,
                            p31: node.p31
                        };
                        let found = visibleNodes.find(obj => {
                            return obj.id === newNode.id
                        });
                        if (!found) visibleNodes.push(newNode);
                    });
                    let visibleLinks = [];
                    node.links.forEach(link => {
                        let newLink = {
                            source: link.source.id,
                            target: link.target.id,
                            name: link.name
                        };
                        visibleLinks.push(newLink);
                    });
                    Graph.graphData({
                        nodes: visibleNodes,
                        links: visibleLinks
                    });
                    collapse = true;
                } else {
                    Graph.graphData(gData);
                    collapse = false;
                }
            });

        function updateHighlight() {
            // trigger update of highlighted objects in scene
            Graph
                .nodeColor(Graph.nodeColor())
                .linkWidth(Graph.linkWidth())
                .linkDirectionalParticles(Graph.linkDirectionalParticles());

        }

        async function checkEntity(entity, endPoint) {
            return $.get({
                url: endPoint + 'api.php?action=wbgetentities&format=json&ids=' + entity,
                dataType: 'jsonp'
            })

        }

        function loadTooltip(data, wikiElement, posX, posY) {
            if (!data.error) {

                var userLang;
                var entity = '';
                var description = ''
                var theme;
                userLang = (navigator.language || navigator.userLanguage).split("-")[0]

                var content = data.entities[wikiElement.toUpperCase()]

                if (!content.labels) return;

                if (content.labels[userLang] && content.descriptions[userLang]) {

                    entity = content.labels[userLang].value + ' (' + wikiElement + ')'
                    description = content.descriptions[userLang].value

                } else {

                    let lb = content.labels['en'];
                    let desc = content.descriptions['en'];
                    if (lb) {
                        entity = lb.value + ' (' + wikiElement + ')';
                    }
                    if (desc) {
                        description = desc.value
                    }

                }

                const themeStyles = {
                    default: {
                        'display': 'inline-block',
                        'justify-content': 'center',
                        'padding': '10px',
                        'border-radius': '8px',
                        'border': '1px solid #B8F5F3',
                        'background': 'white',
                        'color': '#222',
                        'z-index': '1500'
                    },
                    dark: {
                        'display': 'inline-block',
                        'justify-content': 'center',
                        'padding': '5px',
                        'border-radius': '10px',
                        'border': '1px solid #70dbe9',
                        'background': '#222',
                        'color': 'white',
                        'z-index': '1500',
                        'position': 'absolute'
                    }
                }

                const styles = {
                    title: {
                        'text-align': 'left',
                        'font-size': 17,
                        'font-family': 'Arial, Helvetica, sans-serif'
                    },
                    description: {
                        'display': 'inline-block',
                        'line-height': '23px',
                        'text-align': 'left',
                        'margin-top': '3px',
                        'font-size': 14,
                        'font-family': 'Arial, Helvetica, sans-serif'
                    }
                }

                let cssStyle = themeStyles['dark'];

                $('#tooltip')
                    .css('position', 'absolute')
                    .css('z-index', '2000')
                    .css('width', '200px')
                    .css('max-width', '200px').css({
                        top: posY + 2,
                        left: posX + 2
                    })
                    .addClass('wikidataTooltip').css('height', 'auto')
                    .append(
                        $('<div class="wikidata_tooltip">').css(cssStyle)
                        .append(
                            $('<div>').html(entity).css(styles.title))
                        .append(
                            $('<div>').html(description).css(styles.description)))
                    .appendTo('body').fadeIn('slow');
            }
        }

        Graph.d3Force('charge').strength(-240);
    }


}
module.exports = new TresDGen();