import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import {
    CSS2DRenderer,
    CSS2DObject
} from './CSS2DRenderer.js'
import SpriteText from 'three-spritetext';
import $ from "jquery";

class TresDGen {

    constructor() {
        this.changingDetails = false;
        this.styles = {
            title: {
                'text-align': 'left',
                'font-size': 17,
                'font-family': 'Arial, Helvetica, sans-serif',
                'border-bottom': '0.5px double #70dbe9'
            },
            description: {
                'display': 'inline-block',
                'line-height': '23px',
                'text-align': 'left',
                'margin-top': '3px',
                'font-size': 14,
                'font-family': 'Arial, Helvetica, sans-serif'
            },
            dark: {
                'display': 'inline-block',
                'justify-content': 'center',
                'padding': '5px',
                'border-radius': '10px',
                'border': '1px solid #70dbe9',
                'background': '#222',
                'color': 'white',
                'z-index': '1200'
            }
        };
		this.wikidataTooltips = true;
		this.highlightLinks = new Set();
		this.hiddenNodes = false;
		this.hiddenEdges = false;
		this.edgeCardinality = true;
    }

    run(gData, id) {
		let self = this;
        gData.links.forEach(link => {
            const a = gData.nodes.find(obj => {
                return obj.id === link.source
            });
            let b = gData.nodes.find(obj => {
                return obj.id === link.target
            });
			if(!b) { //El nodo objetivo no existe
				b = {id: link.target, p31: null, attributes: []}
				gData.nodes.push(b);
			}
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
        
        let hoverNode = null;
        let activeTooltip = false;
        let activeElement = null;
        let collapse = false;

        const Graph = ForceGraph3D({
            extraRenderers: [new CSS2DRenderer()]
        });

        Graph(document.getElementById(id))
            .graphData(gData)
            .nodeAutoColorBy('id')
            .nodeRelSize(2)
            .onNodeDragEnd(node => {
                node.fx = node.x;
                node.fy = node.y;
                node.fz = node.z;
            })
            .linkWidth(link => self.highlightLinks.has(link) ? 1 : 1)
            .linkDirectionalParticles(link => self.highlightLinks.has(link) ? 2 : 0)
            .linkDirectionalParticleWidth(1)
            .linkColor(link => this.highlightLinks.has(link) ? 'rgba(255,0,255,1)' : 'rgba(0,255,255,0.8)')
            .linkCurvature(link => link.curvature !== undefined ? link.curvature : 0.8)
            .linkCurveRotation('rotation')
            .linkDirectionalArrowLength(link => link.noarrow !== undefined ? 0 : 3.5)
            .linkDirectionalArrowRelPos(1)
            .nodeThreeObjectExtend(true)
            .nodeThreeObject(node => {
                const nodeEl = document.createElement('div');
                nodeEl.textContent = node.id;
                nodeEl.id = node.id;
                Object.assign(nodeEl.style, this.styles.dark);
                nodeEl.style["font-size"] = 12;
                nodeEl.className = "node-label";
				if(this.hiddenNodes) {
					nodeEl.className = "node-label hidden";
				}
                return new CSS2DObject(nodeEl);
            })
            .linkThreeObjectExtend(true)
            .linkPositionUpdate((sprite, {
                start,
                end
            }) => {
                if (sprite.link.__curve) {
                    let textPos = getQuadraticXYZ(
                        0.5,
                        start,
                        sprite.link.__curve.v1,
                        end
                    );
                    if (sprite.link.source === sprite.link.target) {
                        textPos = getQuadraticXYZ(
                            0.5,
                            sprite.link.__curve.v1,
                            sprite.link.__curve.v2,
                            sprite.link.__curve.v3
                        );
                    }
                    Object.assign(sprite.position, textPos);
                } else {
                    const middlePos = Object.assign(...['x', 'y', 'z'].map(c => ({
                        [c]: start[c] + (end[c] - start[c]) / 2 // calc middle point
                    })));

                    Object.assign(sprite.position, middlePos);
                }

            })
            .onNodeHover(async (node) => {
                // no state change
                if ((!node && !highlightNodes.size) || (node && hoverNode === node)) return;

                highlightNodes.clear();
                this.highlightLinks.clear();
                if (node) {
                    if (activeElement !== node.p31) $(".wikidata_tooltip").remove();
                    highlightNodes.add(node);
                    if (node.neighbors) node.neighbors.forEach(neighbor => highlightNodes.add(neighbor));
                    if (node.links) node.links.forEach(link => this.highlightLinks.add(link));
                    if (node.p31 && !activeTooltip && activeElement !== node.p31 && this.wikidataTooltips) {
                        activeTooltip = true;
                        activeElement = node.p31;
                        let endpoint = "https://www.wikidata.org/w/"
                        let data = await checkEntity(node.p31, endpoint)
                        let posX = 0,
                            posY = 0 + $(window).scrollTop();
                        loadTooltip(data, node.p31, posX, posY, this);
                        activeTooltip = false;
                    }
                }

                hoverNode = node || null;

                updateHighlight();
            })
            .onLinkHover(async (link) => {
                highlightNodes.clear();
                this.highlightLinks.clear();

                if (link) {
                    if (activeElement !== link.nname) $(".wikidata_tooltip").remove();
                    this.highlightLinks.add(link);
                    highlightNodes.add(link.source);
                    highlightNodes.add(link.target);
                    if (link.nname && !activeTooltip && activeElement !== link.nname && this.wikidataTooltips) {
                        activeTooltip = true;
                        activeElement = link.nname;
                        let endpoint = "https://www.wikidata.org/w/"
                        let noPrefix = link.nname.split(":").at(-1);
                        let data = await checkEntity(noPrefix, endpoint)
                        let posX = 0,
                            posY = 0 + $(window).scrollTop();
                        loadTooltip(data, noPrefix, posX, posY, this);
                        activeTooltip = false;
                    }
                }

                updateHighlight();
            })
            .onNodeClick(node => {
                if (!this.changingDetails && !this.hiddenNodes) {
                    let self = this;
                    loadDetails(node, self);
                }
            })
            .onNodeRightClick(node => {

                if (!collapse) {
                    let visibleNodes = [];
                    visibleNodes.push({
                        id: node.id,
                        p31: node.p31,
						attributes: node.attributes
                    });
                    node.neighbors.forEach(node => {
                        let newNode = {
                            id: node.id,
                            p31: node.p31,
							attributes: node.attributes
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
                            nname: link.nname,
                            rotation: link.rotation,
							cardinality: link.cardinality
                        };
                        visibleLinks.push(newLink);
                    });
                    Graph.graphData({
                        nodes: visibleNodes,
                        links: visibleLinks
                    });
					const distance = 60;
					const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

					Graph.cameraPosition(
					{ x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
					node,
					100 
					);
                    collapse = true;
                } else {
                    Graph.graphData(gData);
                    collapse = false;
                }
            });
			
		
		if(!this.hiddenEdges) {
			Graph.linkThreeObject(link => {
				const sprite = new SpriteText(`${link.nname}` + `${link.cardinality}`);
                sprite.color = 'lightgrey';
                sprite.textHeight = 2;
                sprite.link = link;
				link.sprite = sprite;
                return sprite;
            })
			gData.links.forEach(link => {
				link.name = undefined;
			});
		}
		else {
			Graph.linkThreeObject(link => {
				const sprite = new SpriteText("");
                sprite.link = link;
				link.sprite = sprite;
                return sprite;
            })
			gData.links.forEach(link => {
				link.name = link.nname;
			});
		}
		
		if(!this.hiddenNodes) {
			Graph.nodeLabel(node => "");
		}
		else {
			Graph.nodeLabel(node => node.id);
		}

        function getQuadraticXYZ(t, s, cp1, e) {
            return {
                x: (1 - t) * (1 - t) * s.x + 2 * (1 - t) * t * cp1.x + t * t * e.x,
                y: (1 - t) * (1 - t) * s.y + 2 * (1 - t) * t * cp1.y + t * t * e.y,
                z: (1 - t) * (1 - t) * s.z + 2 * (1 - t) * t * cp1.z + t * t * e.z
            };
        }

        function loadDetails(node, slf) {
            let nodeOb = $("#" + $.escapeSelector(node.id));
            if (nodeOb.attr("class") && nodeOb.attr("class").includes("activeDetails")) {
                nodeOb.removeClass("activeDetails");
                nodeOb.html("");
                nodeOb
                    .append(
                        $('<div>').text(node.id).css("font-size", 12));
                nodeOb.css("pointer-events", "none");
                nodeOb.css("cursor", "auto");
                nodeOb.unbind("click");
				nodeOb.attr("class", "node-label");
                slf.changingDetails = true;
                setTimeout(function() {
                    slf.changingDetails = false;
                }, 100);
            } else {
                nodeOb.html("");
                let closed = node.closed ? " CLOSED" : "";
                let ats = [];
                if (node.extra) {
                    ats.push("<li>" + node.extra + "</li>");
                }
                let pcoma = node.attributes.length === 1 && node.attributes[0].value === "" ? "" : ";";
                ats = ats.concat(node.attributes.map(a => {
                    return "<li>" + a.predicate + " " + a.value + "<i>" + a.facets + "</i>" + pcoma + "</li>"
                }));
                nodeOb
                    .append(
                        $('<div>').text(node.id + closed).css(slf.styles.title))
                    .append(
                        $('<div>').html('<ul style="list-style-type: none; padding: 0; margin: 0;">' + ats.join("\n") + "</ul>").css(slf.styles.description));
                nodeOb.attr("class", "activeDetails");
                nodeOb.css("pointer-events", "auto");
                nodeOb.css("cursor", "pointer");
                nodeOb.click(() => loadDetails(node, slf));
            }
        }
		
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

        function loadTooltip(data, wikiElement, posX, posY, slf) {
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
                        $('<div class="wikidata_tooltip">').css(slf.styles.dark)
                        .append(
                            $('<div>').html(entity).css(slf.styles.title))
                        .append(
                            $('<div>').html(description).css(slf.styles.description)))
                    .appendTo('body').fadeIn('slow');
            }
        }

        Graph.d3Force('charge').strength(-240);
        return Graph;
    }
	
	getHighlightLinks() {
		return this.highlightLinks;
	}


}
export default new TresDGen();