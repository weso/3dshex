# 3dshex

## Current functionality
* Nodes are individually colored.
* Relationships are colored according to its node.
* Relationships are highlighted when hovering (and its label shown).
* When hovering a node, all its relationships are highlighted.
* Wikidata Tooltips when hovering over a node or a relationships.
* Automatic Zoom when left-clicking a node.
* When right-clicking a node, it exclusively show its relationships and neighbours. A second click reinstates the whole graph.

_For now it should allow any input, but it is solely intended for simple relationships between entities. Anything beyond such prospects has not been implemented nor tested._

## How to use

Install with the following command:

```
npm install 3dshex
```

Once installed, import the function. For instance:

```
import shExTo3D from "3dshex";
```

This function creates a 3DGraph in the specified component, given a ShEx.

```
shExTo3D(shex, "3dgraph");	
```

In this example, we are passing as a parameter a String variable (_shex_) which contains a ShEx-compliant value, 
as well as the reference to a \<div\> ID  (_3dgraph_) .
