(function($, windowObject, navigatorObject) {
	/*
	    References:
	    -->https://shanetully.com/2014/09/a-dead-simple-webrtc-example/
	    -->https://developer.mozilla.org/en-US/docs/Web/Guide/API/WebRTC/Peer-to-peer_communications_with_WebRTC
	    -->https://bitbucket.org/webrtc/codelab
	*/
	var socket = io(),
        //new li entry for appending messages
        entry,
        chatMessage,
        toast = $("#toast"),
        connectedOrDisconnected = $("#connectedOrDisconnected"),
        welcomeID = $("#welcome"),
        chatTextField = document.getElementById("chatTextField"),
        chatMessagesList = document.getElementById("chatMessagesList"),
        startButton = $("#startButton"),
        stopButton = $("#stopButton"),
        makeConnectionForm = $("#makeConnectionForm"),
        localVideo,
        remoteVideo,
        peerConnection,
        peerConnectionConfig = {'iceServers': [{'url': 'stun:stun.services.mozilla.com'}, {'url': 'stun:stun.l.google.com:19302'}]};
    navigatorObject.getUserMedia = navigatorObject.getUserMedia || 
        navigatorObject.mozGetUserMedia || 
        navigatorObject.webkitGetUserMedia;
    windowObject.RTCPeerConnection = windowObject.RTCPeerConnection || 
        windowObject.mozRTCPeerConnection || 
        windowObject.webkitRTCPeerConnection;
    windowObject.RTCIceCandidate = windowObject.RTCIceCandidate || 
        windowObject.mozRTCIceCandidate || 
        windowObject.webkitRTCIceCandidate;
    windowObject.RTCSessionDescription = windowObject.RTCSessionDescription || 
        windowObject.mozRTCSessionDescription || 
        windowObject.webkitRTCSessionDescription;
    var Functions = {
        pageReady : function() {
            localVideo = document.getElementById('localVideo');
            remoteVideo = document.getElementById('remoteVideo');
            //audio video chat using webRTC
            socket.on('message', function(msg) {
                Functions.gotMessageFromServer(msg);
            });
            //text chat using simply socket.io
            socket.on('chatMessage', function(msg) {
                Functions.appendChat("Friend: " + msg);
            });
            //first time when client connect to server
            socket.on('welcome', function(msg) {
                Functions.welcome(msg);
            });
            socket.on('disconnected', function(msg) {
                Functions.disconnected(msg);
            });
            socket.on('connected', function(msg) {
                Functions.connected(msg);
            });
            socket.on('toast', function(notification) {
                Functions.toast(notification);
            });
            var constraints = {
                video: true,
                audio: true,
            };
            if(navigatorObject.getUserMedia) {
                navigatorObject.getUserMedia(constraints,
                    Functions.getUserMediaSuccess, 
                    Functions.getUserMediaError
                );
            } else {
                alert('Your browser does not support getUserMedia API');
            }
        },
        createObjectURL : function(file) {
            if ( windowObject.webkitURL ) {
                return windowObject.webkitURL.createObjectURL( file );
            } else if ( windowObject.URL && windowObject.URL.createObjectURL ) {
                return windowObject.URL.createObjectURL( file );
            } else {
                return null;
            }
        },
        getUserMediaSuccess : function(stream) {
            localStream = stream;
            localVideo.src = Functions.createObjectURL(stream);  
        },
        getUserMediaError : function(error) {
            console.log(error);
            Functions.toast("getUserMedia Error");
        },
        start : function(isCaller) {
            console.log("start called");
            startButton.val("Calling");
            Functions.toast("calling... Please Wait!!");
            peerConnection = new RTCPeerConnection(peerConnectionConfig);
            peerConnection.onicecandidate = Functions.gotIceCandidate;
            peerConnection.onaddstream = Functions.gotRemoteStream;
            peerConnection.addStream(localStream);
            if(isCaller) {
                peerConnection.createOffer(Functions.gotDescription, Functions.createOfferError);
                console.log("offer created");
            }
            startButton.prop('disabled', true);
        },
        gotDescription : function(description) {
            console.log('got description' + description);
            peerConnection.setLocalDescription(description, function () {
                socket.emit('message',JSON.stringify({'sdp': description}));
            },
            function() {
                console.log('set description error');
                Functions.toast("gotDescription Error");
            });
        },
        gotIceCandidate : function(event) {
            if(event.candidate != null) {
                socket.emit('message', JSON.stringify({'ice': event.candidate}));
            }  
        },
        gotRemoteStream : function(event) {
            console.log("got remote stream");
            remoteVideo.src = windowObject.URL.createObjectURL(event.stream);
            startButton.val("Connected");
            Functions.toast("You are in a call!!")
            startButton.prop('disabled', true);    
        },
        createOfferError : function(error) {
            console.log(error); 
            Functions.toast("Error occured: createOfferError"); 
        },
        gotMessageFromServer : function(message) {
            //console.log("From server" + message);
            if(!peerConnection) {
                Functions.start(false);
            }
            var signal = JSON.parse(message);
            if(signal.sdp) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function() {
                    peerConnection.createAnswer(Functions.gotDescription, Functions.createAnswerError);
                    console.log("answer created");
                },
                function() {
                    console.log("setRemoteDescription error");
                    Functions.toast("Error occured: setRemoteDescriptionError");
                });
            } else if(signal.ice) {
                peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
                console.log("ice candidate added");
            }   
        },
        createAnswerError : function() {
            console.log("createAnswerError");
            Functions.toast("Error occured: createAnswerError");  
        },
        appendChat : function(chat) {
            entry = document.createElement('li');
            entry.appendChild(document.createTextNode(chat));
            chatMessagesList.appendChild(entry);
        },
        sendChat : function() {
            chatMessage = chatTextField.value;
            chatTextField.value = "";
            socket.emit('chatMessage', chatMessage);
            Functions.appendChat("You: " + chatMessage);
        },
        welcome : function(message) {
            //console.log(message);
            welcomeID.text("Ask someone to join you. Your id is: " + message);
        },
        connected : function(message) {
            makeConnectionForm.hide();
            welcomeID.hide();
            connectedOrDisconnected.text("connected from: " + message);
            startButton.prop('disabled', false);
            stopButton.prop('disabled', false);
        },
        disconnected : function(message) {
            makeConnectionForm.show();
            welcomeID.show();
            connectedOrDisconnected.text("Disconnecetd from: " + message); 
            startButton.val("Call");
        },
        makeConnection : function() {
            var id = $("#makeConnectionInputField").val();
            if(id.length == 22) {
                socket.emit('makeConnection', id);
            }
            else {
                console.log("enter valid id");
                Functions.toast("enter valid id");
            }
        },
        toast : function(notification) {
            console.log(notification);
            toast.text(notification);
        },
        init : function() {
            startButton.prop('disabled', true);
            stopButton.prop('disabled', true);
        }
    };
    $(startButton).click(function() {
        Functions.start(true);
    });
    $("#typeMessagesForm").submit(function() {
        Functions.sendChat();
        return false;
    });
    makeConnectionForm.submit(function() {
        Functions.makeConnection();
        return false;
    });
    $(document).ready(function() {
        Functions.init();
        Functions.pageReady();
    });
}(jQuery, window, navigator));