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