class GraphGenerator {

    constructor () {
		this.prefixes = null;
		this.shapes = null;
		this.gData = {nodes: [],links: []}
		this.linkID = 0;
		this.nodePairs = new Map();
    }
	
	createGraph(shapes) {
		//console.log(shapes);
		for(let shape in shapes) {
			console.log(shapes[shape]);
			if(shapes[shape].type === "Shape") {
				this.checkExpressions(shapes[shape], shape)
			}
			else if (shapes[shape].type === "ShapeAnd") {
				for(let sh in shapes[shape].shapeExprs) {
					if(shapes[shape].shapeExprs[sh].type === "Shape") {
						this.checkExpressions(shapes[shape].shapeExprs[sh], shape)
					}
				}
			}
			
		}
		this.calculateRotation();
		console.log(this.gData);
		return this.gData;
	}
	
	checkExpressions(shape, name) {
		try {
		let instanceOf = null;
		if(shape.expression) {	
			let expressions = shape.expression.predicate ? [shape.expression] : shape.expression.expressions;
			for(let exp in expressions) {
				let expression = expressions[exp]

				if(expression.type === "TripleConstraint") {
					if(expression.predicate === "http://www.wikidata.org/entity/P31") {
						instanceOf = expression.valueExpr.values[0].split("/")[4]; 
					}
					else if(expression.valueExpr && expression.valueExpr.type === "ShapeRef") {					
						let newLink = { linkID: ++this.linkID, source: name.split("/").at(-1), target:expression.valueExpr.reference.split("/").at(-1), 
							nname:expression.predicate.split("/").at(-1)}
						this.gData.links.push(newLink);
						this.linkNodePair(newLink.source, newLink.target, newLink.linkID);
					}
				}
				
			}
		}
		let newNode = {id:name.split("/").at(-1), p31:instanceOf}
		this.gData.nodes.push(newNode);
		} catch (ex) {
			throw new Error("At " + name + ": " + ex);
		}
	}
	
	linkNodePair(source, target, linkID) {
		let linksst = this.nodePairs.get(source + "-" + target);
		let linksts = this.nodePairs.get(target + "-" + source);
		if(!linksst && !linksts) {
			let links = [];
			links.push(linkID);
			this.nodePairs.set(source + "-" + target, links);
		}
		else if(linksst) {
			linksst.push(linkID);
			this.nodePairs.set(source + "-" + target, linksst);
		}
		else if(linksts) {
			linksts.push(-linkID);
			this.nodePairs.set(target + "-" + source, linksts);
		}
	}
	
	calculateRotation() {
		this.nodePairs.forEach((value,key) => {
			let numberOfLinks = value.length;
			for(let i = 1; i < numberOfLinks + 1; i++) {
				let rotation = Math.PI * i / (numberOfLinks / 2 );
				let lid = value[i - 1];
				if(lid < 0) {
					rotation = - (2 * Math.PI - rotation);
					lid = -lid;
					if(rotation === - 0) rotation = - Math.PI;
					else if(rotation === Math.PI) rotation = - 2 * Math.PI;
				}
				this.gData.links[lid - 1].rotation = rotation;
			}
		});
	}
	
	reset() {
		this.prefixes = null;
		this.shapes = null;
		this.gData = {nodes: [],links: []}
	}
	

}
module.exports = GraphGenerator;