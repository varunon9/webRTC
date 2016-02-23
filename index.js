var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.use(express.static(__dirname + '/public'));
//no need of separate array for clients. pairArray will do the work
/*var clients = [];*/
io.on('connection', function(socket){
    console.log('A connection made by ' + socket.id);
    //add newly connected client to clients array
    /*clients.push(socket.id);*/
    //send greetings to newly connected client
    io.to(socket.id).emit('welcome', socket.id);
    socket.on('message', function(msg){
    	console.log(msg);
        sendMessage(socket, 'message', msg);
    });
    socket.on('chatMessage', function(chat) {
    	console.log(chat);
    	sendMessage(socket, 'chatMessage', chat);
    });
    socket.on('makeConnection', function(id) {
    	console.log("connection request: " + id);
        if(id != socket.id) {
        	makeConnection(socket.id, id);
        }
        else {
        	io.to(socket.id).emit('toast', "Enter your friend's id");
        }
    });
    socket.on('disconnect', function() {
        console.log(socket.id + " disconnected");
        //notify user that his partener has been disconnected
        sendMessage(socket, 'disconnected', socket.id);
        //remove this from clients
        /*var index = clients.indexOf(socket.id);
        clients.splice(index, 1);*/
        //remove corresponding connection pair
        removeConnection(socket.id);
    });
});
//this function will send message to connected client or other partener
function sendMessage(socket, symbol, message) {
	var client = getClient(socket.id);
	if(client != null) {
		io.to(client).emit(symbol, message);
	}
}
//class for connectionPair
var ConnectionPair = function(client1, client2) {
	var clientSource = client1;
	var clientDestination = client2;
	this.getDestinationClient = function(sourceClient) {
		if(clientSource == sourceClient) {
			return clientDestination;
		}
		else if(clientDestination == sourceClient){
			return clientSource;
		}
		else {
			return null;
		}
	}
}
//array will contain all sourec and client pair which are connected to each other
var pairArray = [];
//to make connection of two clients
var makeConnection = function(client1, client2) {
    var connectionPair = new ConnectionPair(client1, client2);
    pairArray.push(connectionPair);
    console.log("connecteion made");
    io.to(client1).emit("connected", client2);
    io.to(client2).emit("connected", client1);
}
var removeConnection = function(client) {
	var i, length = pairArray.length;
    for(i = 0; i < length; i++) {
        if(pairArray[i].getDestinationClient(client) != null) {
        	pairArray.splice(i, 1);
        	break;
        }
    }
}
//will return the client of connected source
var getClient = function(source) {
	var i, length = pairArray.length, client;
    for(i = 0; i < length; i++) {
    	client = pairArray[i].getDestinationClient(source);
        if(client != null) {
        	return client;
        }
    }
}
http.listen(3500, function(){
    console.log('listening on *:3500');
});