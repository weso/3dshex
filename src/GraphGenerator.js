const Cardinality = require ("./ggen/Cardinality.js");
const Constraint = require ("./ggen/Constraint.js");
const Enum = require ("./ggen/Enum.js");

class GraphGenerator {

    constructor (pr) {
		this.gData = {nodes: [],links: []}
		this.linkID = 0;
		this.nodePairs = new Map();
		this.pr = pr;
		this.enu = new Enum(pr);
		this.co = new Constraint(pr);
		this.blankID = 0;
    }
	
	createGraph(shapes) {
		for(let shape in shapes) {		
			let sh = shapes[shape];
			let newNode;		
			if(sh.type === "Shape") {
				newNode = this.checkExpressions(sh, shape)
			}
			else if (sh.type === "ShapeAnd" || sh.type === "ShapeOr" || sh.type === "ShapeNot") {
				let companions = [];
				let relationName = "Composed of";
				if(sh.type === "ShapeNot") {
					sh.shapeExprs = [sh.shapeExpr]; //Para que funcione igual que AND y OR
					relationName = "NOT"
				}
				for(let i = 0; i < sh.shapeExprs.length; i++) {
					let sha = sh.shapeExprs[i]
					if(sha.type === "Shape") {
						let partialNode = this.checkExpressions(sha, "_" + ++this.blankID);
						this.gData.nodes.push(partialNode);
						let newLink = { linkID: ++this.linkID, source: this.pr.getPrefixed(shape), target: "_" + this.blankID, 
							nname: relationName, cardinality: "", curvature: 0}
						this.gData.links.push(newLink);
						this.linkNodePair(newLink.source, newLink.target, newLink.linkID);
						companions.push(newLink.target);
						
					}
					else if(sha.type === "ShapeRef") { // :Titanuser @:User AND
						let newLink = { linkID: ++this.linkID, source: this.pr.getPrefixed(shape), target:this.pr.getPrefixed(sha.reference), 
							nname: relationName, cardinality: "", curvature: 0}
						this.gData.links.push(newLink);
						this.linkNodePair(newLink.source, newLink.target, newLink.linkID);
						companions.push(newLink.target);
					}
					else if(sha.type === "NodeConstraint") {
					    let partialNode = {id: "_" + ++this.blankID, attributes: [{ "predicate": this.checkNodeKind(sha.nodeKind), "value" : "", "facets": "" }]}
						this.gData.nodes.push(partialNode);
						let newLink = { linkID: ++this.linkID, source: this.pr.getPrefixed(shape), target: "_" + this.blankID, 
							nname: relationName, cardinality: "", curvature: 0}
						this.gData.links.push(newLink);
						this.linkNodePair(newLink.source, newLink.target, newLink.linkID);
						companions.push(newLink.target);
					}
				}
				for(let i = 0; i < companions.length - 1; i++) { //Recorrer los componentes del AND/OR y unirlos
				let lop;
				switch(sh.type) {
					case "ShapeAnd":
						lop = "AND";
						break;
					case "ShapeOr":
						lop = "OR";
						break;
				}
					let lopLink = { linkID: ++this.linkID, source: companions[i], target: companions[i + 1], 
					nname: lop, cardinality: "", rotation: 0, curvature: 0, noarrow: true};
					this.gData.links.push(lopLink);
				}
				newNode = {id: this.pr.getPrefixed(shape), attributes: []}
			}
			else if (sh.type === "NodeConstraint") {
				newNode = {id: this.pr.getPrefixed(shape), attributes: [{ "predicate": this.checkNodeKind(sh.nodeKind), "value" : "", "facets": "" }]}
			}		
			else if (sh.type === "ShapeExternal") {
				newNode = {id: this.pr.getPrefixed(shape), attributes: [{ "predicate": "EXTERNAL", "value" : "", "facets": "" }]}
			}
			
			if(sh.closed === true) newNode.closed = true;
			if(sh.extra !== undefined) {
				newNode.extra = this.co.getExtra(sh.extra);
			}
			this.gData.nodes.push(newNode);
		}
		this.calculateRotation();
		console.log(this.gData);
		return this.gData;
	}
	
	checkExpressions(shape, name) {
		try {
		let instanceOf = null;
		let attrs = [];
		if(shape.expression && shape.expression.type === "OneOf") {
			let card = Cardinality.cardinalityOf(shape.expression);
			this.createOneOf(shape.expression.expressions, name, card);
		}
		else if(shape.expression) {	
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
					else if(expression.valueExpr 
							&& (expression.valueExpr.type === "ShapeAnd"
								|| expression.valueExpr.type === "ShapeOr")) { // :productId xsd:string MinLength 5 AND MaxLength 10;
						let ncValue = this.checkNodeConstraint(expression.valueExpr.shapeExprs[0], name);
						let attr;
						if(ncValue) {
							let facets = this.co.checkFacets(expression.valueExpr.shapeExprs[0]);
							if(facets !== "") ncValue = ncValue.replace(".", "");
							let pred = expression.predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" ? "a" : this.pr.getPrefixed(expression.predicate);
							attr = { "predicate": this.safeAngs(pred), "value": this.safeAngs(ncValue), "facets": facets };
							
						}
						let lop = " AND ";
						if(expression.valueExpr.type === "ShapeOr") lop = " OR ";
						for(let i = 1; i < expression.valueExpr.shapeExprs.length; i++) {
							let morefacets = this.co.checkFacets(expression.valueExpr.shapeExprs[i]);
							attr.facets = attr.facets + lop + morefacets;
						}
						attrs.push(attr);
					}
					else if (expression.valueExpr && expression.valueExpr.type === "Shape") {
						let newId = ++this.blankID;
						let partialNode = this.checkExpressions(expression.valueExpr, "_" + newId);
						let card = Cardinality.cardinalityOf(expression);
						this.gData.nodes.push(partialNode);
						let newLink = { linkID: ++this.linkID, source: this.pr.getPrefixed(name), target: "_" + newId, 
							nname: this.pr.getPrefixed(expression.predicate), cardinality: card}
						this.gData.links.push(newLink);
						this.linkNodePair(newLink.source, newLink.target, newLink.linkID);
					}
					else if (expression.valueExpr) {
						let ncValue = this.checkNodeConstraint(expression.valueExpr, name);
						let card = Cardinality.cardinalityOf(expression);
						if(ncValue) {
							let facets = this.co.checkFacets(expression.valueExpr);
							if(facets !== "") ncValue = ncValue.replace(".", "");
							let pred = expression.predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" ? "a" : this.pr.getPrefixed(expression.predicate);
							let attr = { "predicate": this.safeAngs(pred), "value": this.safeAngs(ncValue) + card, "facets": facets };
							attrs.push(attr);
						}	
					}
					else {
						let card = Cardinality.cardinalityOf(expression);
						let attr = { "predicate": this.safeAngs(this.pr.getPrefixed(expression.predicate)), "value": "." + card, "facets": "" };
						attrs.push(attr);
					}
				}
				else if(expression.type === "EachOf" && expression.id) {	//Etiquetada
					let partialNode = this.checkExpressions({expression: { expressions: expression.expressions }}, "$" + this.pr.getPrefixed(expression.id));
					this.gData.nodes.push(partialNode);
					let newLink = { linkID: ++this.linkID, source: this.pr.getPrefixed(name), target: "$" + this.pr.getPrefixed(expression.id), 
						nname: "Composed of", cardinality: ""}
					this.gData.links.push(newLink);
					this.linkNodePair(newLink.source, newLink.target, newLink.linkID);
				}
				else if(expression.type === "Inclusion") {	//Etiquetada
					let newLink = { linkID: ++this.linkID, source: this.pr.getPrefixed(name), target: "$" + this.pr.getPrefixed(expression.include), 
						nname: "&" + this.pr.getPrefixed(expression.include), cardinality: ""}
					this.gData.links.push(newLink);
					this.linkNodePair(newLink.source, newLink.target, newLink.linkID);
				}
				else if(expression.type === "OneOf") {	//OneOf
					let card = Cardinality.cardinalityOf(expression);
					this.createOneOf(expression.expressions, name, card);
				}
			}
		}
		let newNode = {id: this.pr.getPrefixed(name), p31:instanceOf, attributes: attrs}
		return newNode;		
		} catch (ex) {
			throw new Error("At " + name + ": " + ex);
		}
	}
	
	createOneOf(exps, name, card) {
		let companions = [];
		let relationName = "Composed of";
		for(let i = 0; i < exps.length; i++) {
			let exp = exps[i]
			let newId = ++this.blankID;
			let partialNode = this.checkExpressions({expression: exp}, "_" + newId);
			this.gData.nodes.push(partialNode);		
			let newLink = { linkID: ++this.linkID, source: this.pr.getPrefixed(name), target: "_" + newId, 
				nname: relationName, cardinality: card, curvature: 0}
			this.gData.links.push(newLink);
			this.linkNodePair(newLink.source, newLink.target, newLink.linkID);
			companions.push(newLink.target);					
		}
		for(let i = 0; i < companions.length - 1; i++) { //Recorrer los componentes del OneOf y unirlos
			let lopLink = { linkID: ++this.linkID, source: companions[i], target: companions[i + 1], 
			nname: "OneOf", cardinality: "", rotation: 0, curvature: 0, noarrow: true};
			this.gData.links.push(lopLink);
		}
	}
	
	checkNodeConstraint(vex, name) {
        //Conjunto de valores -> enumeración
        if(vex.values) {
            //Relación de tipo "a" ( a [:User])
			let pValues = this.enu.createEnumeration(vex.values);
			
			return "[" + pValues.join(" ") + "]";
        }
        //Tipo de nodo (Literal, IRI...) -> Atributo con tal tipo
        if(vex.nodeKind) {
			return this.checkNodeKind(vex.nodeKind);
        }
        //Tipo de dato -> atributo común
        if(vex.datatype) {
			return this.pr.getPrefixed(vex.datatype);
        }

        return ".";
	}
	
	checkNodeKind(nk) {
		if(nk === "literal") return "Literal"
		else if(nk === "iri") return "IRI"
		else if(nk === "bnode") return "BNode"
		else if(nk === "nonliteral") return "NonLiteral"
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
	
	safeAngs(pred) {
		return pred.replace(/</g, "&lt;").replace(/>/g, "&gt;")
	}
 	
	reset() {
		this.gData = {nodes: [],links: []}
		this.linkID = 0;
		this.nodePairs = new Map();
	}
	

}
module.exports = GraphGenerator;