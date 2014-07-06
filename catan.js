// Class definition of a node. Represents an intersection on the Catan
// board.
function Node(type) {
  // A node can either be normal or inverted. Used only for redering the
  // board properly.
  this.node_type = type;

  // Each node can have up to three adjacent nodes. Represented by the
  // unique_ids of the nodes in the Board collection.
  this.node_left = null;
  this.node_right = null;
  this.node_vert = null;

  // Each node can have up to three roads attached to it.
  this.road_left = null;
  this.road_right = null;
  this.road_vert = null;

  // Each node can have up to three associated tiles from which players
  // receive resources.
  this.tile_vertical = null;
  this.tile_left = null;
  this.tile_right= null;

  // A node may have a structure constructed on it by a particular
  // player. Only one structure is allowed per node.
  this.structure = null;

  // A node may have a harbor associated with it for cheaper trades for
  // the player that owns the node.
  this.harbor = null;

  // A boolean value to determine whether or not the current node can
  // support a structure. True if no adjacent nodes have structures.
  this.buildable = true;


  // Sets the buildable? property of all adjacent nodes to false.
  // FIX IT!!!!!!!
  this.adjacents_unbuildable = function() {
    if (this.node_left != null) {
      this.node_left.buildable = false;
    }
    if (this.node_right != null) {
      this.node_right.buildable = false;
    }
    if (this.node_vert != null) {
      this.node_vert.buildable = false;
    }
  };
}

// Class definition of a tile. Represents hexagonal tile formed by 6
// nodes on a Catan board.
function Tile() {
  // Each tile has six associated nodes, one at each vertex. The capital
  // letters in the names are the locations of the node (ex. N = North).
  this.nodeN = null;
  this.nodeNE = null;
  this.nodeSE = null;
  this.nodeS = null;
  this.nodeSW = null;
  this.nodeNW = null;

  // Each tile has a type. One of Forest, Field, Pasture, Mountain,
  // Hill, or Desert.
  this.tile_type = null;

  // Each tile has an associated token between 2 and 12, excluding 7.
  this.token = null;

  // A tile may have a robber on it. True if robber is on tile.
  this.robber_present = false;
}

// A MongoDB collection which stores the nodes of the board. Each document
// in the collection is a separate node.
Board = new Meteor.Collection("board");
StartNode = new Meteor.Collection("startnode");

if (Meteor.isClient) {
  window.onload = function() {
    var svg = document.getElementById("svg");
    var circle = document.createElement("circle");
    circle.setAttribute("cx", 50);
    circle.setAttribute("cy", 50);
    circle.setAttribute("r", 40);
    circle.setAttribute("stroke", "black");
    circle.setAttribute("stroke-width", 3)
    circle.setAttribute("fill", "red");
    svg.appendChild(circle);
  }
}

if (Meteor.isServer) {

  // code to run on server at startup
  Meteor.startup(function () {

    // Wipe collection at startup
    Board.remove({});
    StartNode.remove({});

    // Create an empty Catan board, with nodes and no tiles.
    // Make first two rows of nodes, starting from the bottom right for
    // both rows and building to the left simultaneously.
    var row1_id = Board.insert(new Node("normal"));
    var row2_id = Board.insert(new Node("inverted"));
    Board.update(row1_id, {$set: {node_vert: row2_id}});
    Board.update(row2_id, {$set: {node_vert:row1_id}});

    // store row1_id in a collection to serve as the starting point for the
    // graph.
    StartNode.insert({nodeId: row1_id});

    // traverse to the left, making three hexagons
    for (var i = 0; i != 3; i++) {
      var row1_mid_id = Board.insert(new Node("inverted"));
      var row2_mid_id = Board.insert(new Node("normal"));
      Board.update(row1_id, {$set: {node_left: row1_mid_id}});
      Board.update(row1_mid_id, {$set: {node_right: row1_id}});
      Board.update(row2_id, {$set: {node_left: row2_mid_id}});
      Board.update(row2_mid_id, {$set: {node_right: row2_id}});

      row1_id = Board.insert(new Node("normal"));
      row2_id = Board.insert(new Node("inverted"));
      Board.update(row1_mid_id, {$set: {node_left: row1_id}});
      Board.update(row1_id, {$set: {node_right: row1_mid_id}});
      Board.update(row2_mid_id, {$set: {node_left: row2_id}});
      Board.update(row2_id, {$set: {node_right: row2_mid_id}});

      Board.update(row1_id, {$set: {node_vert: row2_id}});
      Board.update(row2_id, {$set: {node_vert: row1_id}});
    }

    // give row2_id a new name to make it relevant for the other rows.
    var topleft_id = row2_id;

    // populate the other rows, one at a time. 
    for (var i = 0; i != 4; i++) {
      var length;

      // set the length of the row currently being populated.
      switch (i) {
        case 0:
          length = 4;
          break;
        case 1:
           length = 5;
          break;
        case 2:
          length = 4;
          break;
        case 3:
          length = 3;
          break; 
      }

      // create the leftmost two nodes of the row.
      if (i == 0 || i == 1) {
        var bottom_id = Board.insert(new Node("normal"));
        Board.update(topleft_id, {$set: {node_left: bottom_id}});
        Board.update(bottom_id, {$set: {node_right: topleft_id}});
        var top_id = Board.insert(new Node("inverted"));
        Board.update(bottom_id, {$set: {node_vert: top_id}});
        Board.update(top_id, {$set: {node_vert: bottom_id}});
      } else {
        var bottom_id = Board.find(topleft_id).fetch()[0].node_right;
        var top_id = Board.insert(new Node("inverted"));
        Board.update(bottom_id, {$set: {node_vert: top_id}});
        Board.update(top_id, {$set: {node_vert: bottom_id}});
      }

      // update the value of topleft_id
      topleft_id = top_id;

      // populate the current row starting from the leftmost node and moving
      // right.
      for (var j = 0; j != length; j++) {
        // make the left half of the hexagon.
        var topmid_id = Board.insert(new Node("normal"));
        Board.update(top_id, {$set: {node_right: topmid_id}});
        Board.update(topmid_id, {$set: {node_left: top_id}});
        var botmid_id = Board.find(bottom_id).fetch()[0].node_right;

        // make the right half of the hexagon.
        top_id = Board.insert(new Node("inverted"));
        Board.update(topmid_id, {$set: {node_right: top_id}});
        Board.update(top_id, {$set: {node_left: topmid_id}});
        if (j == length - 1 && (i == 0 || i == 1)) {
          bottom_id = Board.insert(new Node("normal"));
          Board.update(botmid_id, {$set: {node_right: bottom_id}});
          Board.update(bottom_id, {$set: {node_left: botmid_id}});
        } else {
          bottom_id = Board.find(botmid_id).fetch()[0].node_right;  
        }

        // connect the right-most nodes.
        Board.update(bottom_id, {$set: {node_vert: top_id}});
        Board.update(top_id, {$set: {node_vert: bottom_id}});
      }
    }
  });

}