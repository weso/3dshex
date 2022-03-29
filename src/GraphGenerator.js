const Cardinality = require ("./ggen/Cardinality.js");
const Enum = require ("./ggen/Enum.js");

class GraphGenerator {

    constructor (pr) {
		this.gData = {nodes: [],links: []}
		this.linkID = 0;
		this.nodePairs = new Map();
		this.pr = pr;
		this.enu = new Enum(pr);
    }
	
	createGraph(shapes) {
		for(let shape in shapes) {
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
		let attrs = [];
		if(shape.expression) {	
			let expressions = shape.expression.predicate ? [shape.expression] : shape.expression.expressions;
			for(let exp in expressions) {
				let expression = expressions[exp]

				if(expression.type === "TripleConstraint") {
					if(expression.predicate === "http://www.wikidata.org/entity/P31") {
						instanceOf = expression.valueExpr.values[0].split("/")[4]; 
					}
					else if(expression.valueExpr && expression.valueExpr.type === "ShapeRef") {
						let card = Cardinality.cardinalityOf(expression);
						let newLink = { linkID: ++this.linkID, source: this.pr.getPrefixed(name), target:this.pr.getPrefixed(expression.valueExpr.reference), 
							nname: this.pr.getPrefixed(expression.predicate), cardinality: card}
						this.gData.links.push(newLink);
						this.linkNodePair(newLink.source, newLink.target, newLink.linkID);
					}
					else if (expression.valueExpr) {
						let ncValue = this.checkNodeConstraint(expression, name);
						if(ncValue) {
							let attr = { "predicate": this.pr.getPrefixed(expression.predicate), "value": ncValue };
							attrs.push(attr);
						}	
					}
					else {
						let attr = { "predicate": this.pr.getPrefixed(expression.predicate), "value": "." };
						attrs.push(attr);
					}
				}
				
			}
		}
		let newNode = {id: this.pr.getPrefixed(name), p31:instanceOf, attributes: attrs}
		this.gData.nodes.push(newNode);
		} catch (ex) {
			throw new Error("At " + name + ": " + ex);
		}
	}
	
	checkNodeConstraint(expr, name) {
		let card = Cardinality.cardinalityOf(expr);
        //Conjunto de valores -> enumeración
        if(expr.valueExpr.values) {
            //Relación de tipo "a" ( a [:User])
            if(expr.predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
				let newLink = { linkID: ++this.linkID, source: this.pr.getPrefixed(name), target: this.pr.getPrefixed(expr.valueExpr.values[0]), 
							nname: this.pr.getPrefixed(expression.predicate)}
				this.gData.links.push(newLink);
				return false;
            }
			let pValues = this.enu.createEnumeration(expr.valueExpr.values);
			
			return "[" + pValues.join(" ") + "]" + card;
        }
        //Tipo de nodo (Literal, IRI...) -> Atributo con tal tipo
        if(expr.valueExpr.nodeKind) {
			return expr.valueExpr.nodeKind + card;
        }
        //Tipo de dato -> atributo común
        if(expr.valueExpr.datatype) {
			return this.pr.getPrefixed(expr.valueExpr.datatype) + card;
        }
		if(expr.valueExpr.pattern) {
			return expr.valueExpr.pattern + card;
		}

        return "." + card;
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
		this.gData = {nodes: [],links: []}
		this.linkID = 0;
		this.nodePairs = new Map();
	}
	

}
module.exports = GraphGenerator;