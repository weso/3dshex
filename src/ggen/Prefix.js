class Prefix {

    constructor () {
		this.prefixes = null;
		this.base = null;
    }
	
	getPrefixed(iri) {
		let res = iri;
		this.prefixes.forEach((value,key) => {
			if(iri.includes(key)) {
				console.log
                res = value + ":" + iri.replace(key, "");
            }
		});
		if(res === iri) { //No existe en los registros, sea base pues
			res = "<" + iri.replace(this.base, "") + ">";
		}
        return res;
	}
	
	reset() {
		this.prefixes = null;
	}
	

}
module.exports = Prefix;