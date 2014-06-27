$(document).ready(function() {
	setScreen(false);

	socket = io.connect("192.168.60.213:3000");
	//socket = io.connect("192.168.1.102:3000");
	//socket = io.connect("http://localhost:3000");
	
	regiesterClientMethods(socket);

	registerEvents(socket);

	var myRoomID = null;

	$("form").submit(function(event) {
	event.preventDefault();
	});

	$("#conversation").bind("DOMSubtreeModified",function() {
	$("#conversation").animate({
		scrollTop: $("#conversation")[0].scrollHeight
	  });
	});
});

var screenSet = false,
socket;

function setScreen(isLogin) {

	if (!isLogin) {

		$("#divChat").hide();
		$("#divLogin").show();
	}
	else {
		$("#divChat").show();
		$("#divLogin").hide();
	}

}

function regiesterClientMethods(socket)
{
	socket.on("isTyping", function(data) {
		if (data.isTyping) {
		  if ($("#"+data.person+"").length === 0) {
			$("#updates").append("<li id='"+ data.person +"'><span class='text-muted'><small><i class='fa fa-keyboard-o'></i> " + data.person + " is typing.</small></li>");
			timeout = setTimeout(timeoutFunction, 5000);
		  }
		} else {
		  $("#"+data.person+"").remove();
		}
	});

	socket.on("exists", function(data) {
		alert(data.msg + "\r\nTry " + data.proposedName);
	});

	socket.on("joined", function(people) {
		$.each(people, function(clientid, obj) {
			$('#hdId').val(clientid);
			$('#hdUserName').val(obj.name);
			$('#spanUser').html(obj.name);
		});
	});

	socket.on("history", function(data) {
	  if (data.length !== 0) {
		$("#msgs").append("<li><strong><span class='text-warning'>Last 10 messages:</li>");
		$.each(data, function(data, msg) {
		  $("#msgs").append("<li><span class='text-warning'>" + msg + "</span></li>");
		});
	  } else {
		$("#msgs").append("<li><strong><span class='text-warning'>No past messages in this room.</li>");
	  }
	});

  socket.on("update", function(msg) {
    $("#msgs").append("<li>" + msg + "</li>");
  });

  socket.on("update-people", function(people){
		if(!screenSet){
			screenSet = true;
			setScreen(true);
		}
		$("#divusers").empty();
		$.each(people, function(clientid, obj) {
			AddUser(socket, clientid, obj.name);
		});
  });
  
  socket.on("update-people-disconnected", function(userName, id){
		$('#' + id).remove();

		var ctrId = 'private_' + id;
		$('#' + ctrId).remove();


		var disc = $('<div class="disconnect">"' + userName + '" logged off.</div>');

		$(disc).hide();
		$('#divusers').prepend(disc);
		$(disc).fadeIn(200).delay(2000).fadeOut(200);
  });

  socket.on("chat", function(person, msg) {
    AddMessage(person.name, msg);
    //clear typing field
     $("#"+person.name+"").remove();
     clearTimeout(timeout);
     timeout = setTimeout(timeoutFunction, 0);
  });

  socket.on("whisper", function(windowId, person, msg) {
    /*if (person.name === "You") {
      s = "whisper"
    } else {
      s = "whispers"
    }
    $("#msgs").append("<li><strong><span class='text-muted'>" + person.name + "</span></strong> "+s+": " + msg + "</li>");*/
	var ctrId = 'private_' + windowId;
	if ($('#' + ctrId).length == 0) {
		createPrivateChatWindow(socket, windowId, ctrId, person.name);
	}

	$('#' + ctrId).find('#divMessage').append('<div class="message"><span class="userName">' + person.name + '</span>: ' + msg + '</div>');
	// set scrollbar
	var height = $('#' + ctrId).find('#divMessage')[0].scrollHeight;
	$('#' + ctrId).find('#divMessage').scrollTop(height);
  });

  socket.on("roomList", function(data) {
    $("#rooms").text("");
    $("#rooms").append("<li class=\"list-group-item active\">List of rooms <span class=\"badge\">"+data.count+"</span></li>");
     if (!jQuery.isEmptyObject(data.rooms)) { 
      $.each(data.rooms, function(id, room) {
        var html = "<button id="+id+" class='joinRoomBtn btn btn-default btn-xs' >Join</button>" + " " + "<button id="+id+" class='removeRoomBtn btn btn-default btn-xs'>Remove</button>";
        $('#rooms').append("<li id="+id+" class=\"list-group-item\"><span>" + room.name + "</span> " + html + "</li>");
      });
    } else {
      $("#rooms").append("<li class=\"list-group-item\">There are no rooms yet.</li>");
    }
  });

  socket.on("sendRoomID", function(data) {
    myRoomID = data.id;
  });

  socket.on("disconnect", function(){
    $("#msgs").append("<li><strong><span class='text-warning'>The server is not available</span></strong></li>");
    $("#msg").attr("disabled", "disabled");
    $("#send").attr("disabled", "disabled");
  });

}

//'is typing' message
  var typing = false;
  var timeout = undefined;

  function timeoutFunction() {
    typing = false;
    socket.emit("typing", false);
  }

function registerEvents(socket) 
{
    $("#btnStartChat").click(function() {
		var name = $("#txtNickName").val();
		var device = "desktop";
		if (navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
		  device = "mobile";
		}
		if (name.length > 0) {
			socket.emit("joinserver", name, device);
		}
		else {
			alert("Please enter name");
		}
  });

  $("#name").keypress(function(e){
    var name = $("#name").val();
    if(name.length < 2) {
      $("#join").attr('disabled', 'disabled'); 
    } else {
      $("#errors").empty();
      $("#errors").hide();
      $("#join").removeAttr('disabled');
    }
  });

  //main chat screen
  $("#btnSendMsg").click(function() {
    var msg = $("#txtMessage").val();
    if (msg !== "") {
      socket.emit("send", msg);
      $("#txtMessage").val("");
    }
  });

  

  $("#txtMessage").keypress(function(e){
    if (e.which !== 13) {
      //if (typing === false && myRoomID !== null && $("#msg").is(":focus")) {
	  if (typing === false && $("#txtMessage").is(":focus")) {
        typing = true;
        socket.emit("typing", true);
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(timeoutFunction, 5000);
      }
    }
  });

  $("#showCreateRoom").click(function() {
    $("#createRoomForm").toggle();
  });

  $("#createRoomBtn").click(function() {
    var roomExists = false;
    var roomName = $("#createRoomName").val();
    socket.emit("check", roomName, function(data) {
      roomExists = data.result;
       if (roomExists) {
          $("#errors").empty();
          $("#errors").show();
          $("#errors").append("Room <i>" + roomName + "</i> already exists");
        } else {      
        if (roomName.length > 0) { //also check for roomname
          socket.emit("createRoom", roomName);
          $("#errors").empty();
          $("#errors").hide();
          }
        }
    });
  });

  $("#rooms").on('click', '.joinRoomBtn', function() {
    var roomName = $(this).siblings("span").text();
    var roomID = $(this).attr("id");
    socket.emit("joinRoom", roomID);
  });

  $("#rooms").on('click', '.removeRoomBtn', function() {
    var roomName = $(this).siblings("span").text();
    var roomID = $(this).attr("id");
    socket.emit("removeRoom", roomID);
    $("#createRoom").show();
  }); 

  $("#leave").click(function() {
    var roomID = myRoomID;
    socket.emit("leaveRoom", roomID);
    $("#createRoom").show();
  });

  $("#people").on('click', '.whisper', function() {
    var name = $(this).siblings("span").text();
    $("#msg").val("w:"+name+":");
    $("#msg").focus();
  });
}

function AddUser(socket, id, name) {
	var userId = $('#hdId').val();
	var code = "";
	if (userId == id) {
		code = $('<div class="loginUser">' + name + "</div>");
	}
	else {
		code = $('<a id="' + id + '" class="user" >' + name + '<a>');
		$(code).click(function () {
			var id = $(this).attr('id');
			if (userId != id)
				OpenPrivateChatWindow(socket, id, name);
		});
	}
	$("#divusers").append(code);
}

function OpenPrivateChatWindow(socket, id, userName) {
	var ctrId = 'private_' + id;
	if ($('#' + ctrId).length > 0) return;
	createPrivateChatWindow(socket, id, ctrId, userName);
}

function AddMessage(userName, message) {
	$('#divChatWindow').append('<div class="message"><span class="userName">' + userName + '</span>: ' + message + '</div>');

	var height = $('#divChatWindow')[0].scrollHeight;
	$('#divChatWindow').scrollTop(height);
}

function createPrivateChatWindow(socket, userId, ctrId, userName) {
	var div = '<div id="' + ctrId + '" class="ui-widget-content draggable" rel="0">' +
			   '<div class="header">' +
				  '<div  style="float:right;">' +
					  '<img id="imgDelete"  style="cursor:pointer;" src="/Images/delete.png"/>' +
				   '</div>' +

				   '<span class="selText" rel="0">' + userName + '</span>' +
			   '</div>' +
			   '<div id="divMessage" class="messageArea">' +

			   '</div>' +
			   '<div class="buttonBar">' +
				  '<input id="txtPrivateMessage" class="msgText" type="text"   />' +
				  '<input id="btnSendMessage" class="submitButton button" type="button" value="Send"   />' +
			   '</div>' +
			'</div>';

	var $div = $(div);

	// DELETE BUTTON IMAGE
	$div.find('#imgDelete').click(function () {
		$('#' + ctrId).remove();
	});

	// Send Button event
	$div.find("#btnSendMessage").click(function () {

		$textBox = $div.find("#txtPrivateMessage");
		var msg = $textBox.val();
		if (msg.length > 0) {
			socket.emit("private", userId, msg);
			//chatHub.server.sendPrivateMessage(userId, msg);
			$textBox.val('');
		}
	});

	// Text Box event
	$div.find("#txtPrivateMessage").keypress(function (e) {
		if (e.which == 13) {
			$div.find("#btnSendMessage").click();
		}
	});

	AddDivToContainer($div);
}

function AddDivToContainer($div) {
	$('#divContainer').prepend($div);

	$div.draggable({

		handle: ".header",
		stop: function () {

		}
	});
}