const shexParser = require("./src/ShExParser.js");
import TresDGen from './src/TresDGen.js';
import autocomplete from './src/search/Search.js';
import $ from "jquery";
import SpriteText from 'three-spritetext';

class ShExTo3D {
	
	constructor () {
		this.graph = null;
		this.gData = null;
		this.highlightLinks = null;
    }

	shExTo3D(text, id) {
		let nodeList = [];
		try {
			this.gData = shexParser.parseShExToGraph(text);
			this.gData.nodes.forEach(node => {
				nodeList.push(node.id);
			});
		} catch(ex) {
			alert("An error has occurred when generating the graph data: \n" + ex);
		}
		
		if(this.gData.nodes.length > 69) {
			$('#chStNode').prop('checked', false);
			TresDGen.hiddenNodes = true;

		}
		if(this.gData.links.length > 288) {
			$('#chStEdge').prop('checked', false);
			TresDGen.hiddenEdges = true;
		}
		
		try {
			this.graph = TresDGen.run(this.gData, id);
			this.highlightLinks = TresDGen.getHighlightLinks();
			autocomplete(document.getElementById("nodeInput"), nodeList, this);
		} catch(ex) {
			alert("An error has occurred when generating the visualization: \n" + ex);
		}
		return this.graph;
	}
	
	nodeCloseup(id) {
		const node = this.gData.nodes.find(obj => {
                return obj.id === id
            });
		const distance = 60;
        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

		this.graph.cameraPosition(
		{ x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
		node,
		2000 
		);
	}
	
	setWikidataTooltips(val) {
		TresDGen.wikidataTooltips = val;
	}
	
	setNodeLabels(val) {
		if(val) { //Ponerlos
			$( ".node-label" ).each(function() {
			  $(this).removeClass('hidden');
			});
			TresDGen.hiddenNodes = !val;
			this.graph.nodeLabel(node => "");
		} 
		else { //Quitarlos
			$( ".node-label" ).each(function() {
			  $(this).addClass('hidden');
			});
			TresDGen.hiddenNodes = !val;
			this.graph.nodeLabel(node => node.id);
		}
	}
	
	setStaticEdges(val) {
		TresDGen.hiddenEdges = !val;
		if(val) { 
			this.graph.linkThreeObject(link => {
				let cardinality = TresDGen.edgeCardinality ? link.cardinality : "";
				return this.createSprite(link.nname + cardinality, link);
            })
			this.gData.links.forEach(link => {
				link.name = undefined;
			});
		} 
		else { 
			this.graph.linkThreeObject(link => {
				return this.createSprite("", link);
            })
			this.gData.links.forEach(link => {
				link.name = link.nname;
			});
		}
	}
	
	setEdgeCardinality(val) {
		TresDGen.edgeCardinality = val;
		if(!TresDGen.hiddenEdges) {
			if(val) { 
				this.graph.linkThreeObject(link => {
					return this.createSprite(`${link.nname}` + `${link.cardinality}`, link);
				})
			} 
			else { 
				this.graph.linkThreeObject(link => {
					return this.createSprite(`${link.nname}`, link);
				})
			}
		}
		
	}
	
	createSprite(text, link) {
		const sprite = new SpriteText(text);
		sprite.color = 'lightgrey';
		sprite.textHeight = 2;
		sprite.link = link;
		link.sprite = sprite;
		return sprite;
	}
}
export default new ShExTo3D();