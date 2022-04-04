import sh3 from "../main.js";

if(document.getElementById("shextext") !== null) {
    var shExEditor = CodeMirror.fromTextArea(document.getElementById("shextext"), {
        mode: "shex",
        lineNumbers: true
    });
    let theme = sessionStorage.getItem("theme");
    shExEditor.setOption("theme", "ayu-mirage");
}

let shxtx = $('#shextograph');
shxtx.click(sshExTo3D);

function sshExTo3D() {
	let text = shExEditor.getValue();
	sh3.shExTo3D(text, "3d-graph");

	$("#editorcontainer").css("display", "none");
	$("#graphcontainer").css("display", "inherit");
	$("#autocompletecontainer").removeClass("hidden");
	$("#open-modal").removeClass("hidden");
}

let load = $('#loadex');

load.click(loadExample);

function loadExample() {
	$.get('./static/genewiki.shex.txt', function(data) {
		shExEditor.setValue(data);
	});
}

$( "#nodeInput" ).keydown(function(event) {
	let term = $( "#nodeInput" ).val();
	search(event, term);
});

function search(event, id) {
	if(event.key === 'Enter') {
		sh3.nodeCloseup(id);
	}
	
}

//Gestión de modales
const openEls = document.querySelectorAll("[data-open]");
const closeEls = document.querySelectorAll("[data-close]");
const isVisible = "is-visible";
 
for(const el of openEls) {
  el.addEventListener("click", function() {
    const modalId = this.dataset.open;
    document.getElementById(modalId).classList.add(isVisible);
  });
}
 
for (const el of closeEls) {
  el.addEventListener("click", function() {
    this.parentElement.parentElement.parentElement.classList.remove(isVisible);
  });
}
 
document.addEventListener("click", e => {
  if (e.target == document.querySelector(".modal.is-visible")) {
    document.querySelector(".modal.is-visible").classList.remove(isVisible);
  }
});

document.addEventListener("keyup", e => {
  if (e.key == "Escape" && document.querySelector(".modal.is-visible")) {
    document.querySelector(".modal.is-visible").classList.remove(isVisible);
  }
});

const chWikidata = document.getElementById('chWikidata')
const chStNode = document.getElementById('chStNode')
const chStEdge = document.getElementById('chStEdge')
const chCardEdge = document.getElementById('chCardEdge')

chWikidata.addEventListener('change', (event) => {
  if (event.currentTarget.checked) {
		$("#tooltip").removeClass('hidden');
		sh3.setWikidataTooltips(true);
  } else {
	  $("#tooltip").addClass('hidden');
	  sh3.setWikidataTooltips(false);
    
  }
})

chStNode.addEventListener('change', (event) => {
  if (event.currentTarget.checked) {
    sh3.setNodeLabels(true);
  } else {
     sh3.setNodeLabels(false);
  }
})

chStEdge.addEventListener('change', (event) => {
  if (event.currentTarget.checked) {
    sh3.setStaticEdges(true);
  } else {
     sh3.setStaticEdges(false);
  }
})

chCardEdge.addEventListener('change', (event) => {
  if (event.currentTarget.checked) {
    sh3.setEdgeCardinality(true);
  } else {
     sh3.setEdgeCardinality(false);
  }
})