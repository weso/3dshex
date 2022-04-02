const shexParser = require("./src/ShExParser.js");
import TresDGen from './src/TresDGen.js';
import autocomplete from './src/search/Search.js';

class ShExTo3D {
	
	constructor () {
		this.graph = null;
		this.gData = null;
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
		
		try {
			this.graph = TresDGen.run(this.gData, id);
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
}
module.exports = new ShExTo3D();