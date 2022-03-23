const shexParser = require("./src/ShExParser.js");
const TresDGen = require("./src/TresDGen.js");

function shExTo3D(text, id) {
	let gData = null;
	
	try {
		gData = shexParser.parseShExToGraph(text);
	} catch(ex) {
		alert("An error has occurred when generating the graph data: \n" + ex);
	}
	
	try {
		TresDGen.run(gData, id);
	} catch(ex) {
		alert("An error has occurred when generating the visualization: \n" + ex);
	}
}

module.exports = {
    shExTo3D
}