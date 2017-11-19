'use strict';
if ('undefined' == typeof(isTyping)){var isTyping = false;}

// styles
var css = "ul.chat-context-menu{ position: fixed; background: #111111; color: white; padding: 0; margin: 0; border-radius: 20px; padding: 15px 0; border: 1px solid rgba(0, 0, 0, .10); border-color: rgba(255, 255, 255, .15);}" +
	"ul.chat-context-menu li {color: white; list-style-type: none; margin:0; padding: 0;}" +
	"ul.chat-context-menu a {color: white; list-style-type: none; display: block; padding: 10px 15px; background: #111111; transition: background .3s ease;}" +
	"ul.chat-context-menu a:hover {background: black;}" +
	"ul.chat-context-menu a.processing{background: #24352f}" +
	"ul.chat-context-menu a.success{background: #306b1a}" +
	"ul.chat-context-menu a.error{background: #6b1a1a}";
var head = document.head || document.getElementsByTagName('head')[0],
	style = document.createElement('style');

style.type = 'text/css';
if (style.styleSheet){
	style.styleSheet.cssText = css;
} else {
	style.appendChild(document.createTextNode(css));
}

head.appendChild(style);

// code

// insert pm sequence into chat
function privateChatMessage(chatId){
	$("#chattextbox").val('!pm ' + chatId + ' ');
	if (!hasOverlay) {
		document.getElementById("chattextbox").focus();
		isTyping = true;
	}
}

// remove currently existing context menu with fade
window.cleanupContextMenu = function(speed){
	if (!speed){speed = 1500;}
	var target = $('body .chat-context-menu');
	target.fadeOut(speed);
	setTimeout(function(){
		target.remove();
	}, speed);
};

// context menu listener
$(document).on('contextmenu', '#chat .chatnick', function(e) {
	// cleanup
	cleanupContextMenu(300);

	// figure ot the target element and all the parameters
	var target = $(e.target);
	//console.log('context menu called', target);
	if (!target.hasClass('chatnick')){target = target.closest('chatnick');}
	var chatNick = target.text().slice(0, -1);
	var chatId = target.attr('title');
	var locale = settedlang && settedlang == 'ru' ? 'ru' : 'en';
	// get the menu items
	var queue = [];

	var texts = {
		sendMessage: {
			ru: 'Личное сообщение',
			en: 'Private message'
		},
		addToFriends: {
			ru: 'Добавить в друзья',
			en: 'Add to friends'
		}
	}

	// send private message
	if (window.settednick !== chatNick){
		var pm = '<a class="send-private-message" data-chat-id="' + chatId + '">' + texts.sendMessage[locale] + '</a>';
		queue.push(pm);
	}

	// add to friends
	if (window.donid && window.donid.length && (window.settednick !== chatNick)){
		var addToFriends = '<a class="context-add-to-friends" data-chat-nick="' + chatNick + '">' + texts.addToFriends[locale] + '</a>';
		queue.push(addToFriends);
	}


	var menu = "<ul class='chat-context-menu' data-chat-id='" + chatId + "' data-chat-nick='" + chatNick + "'>";
	//console.log('queue', queue);
	queue.map(function(element){
		return menu += '<li>' + element + '</li>';
	});
	menu += '</ul>';
	menu = queue.length ? $(menu) : null;

	if (!menu){return false;}

	// calculate and set the context menu position
	var windowHeight = $(window).height();
	var menuHeight = $(menu).height() || 150;
	console.log('windowHeight', windowHeight, 'menuHeight', menuHeight);
	var posX = e.pageX + 'px',
		posY = windowHeight - e.pageY >= menuHeight ? e.pageY + 'px': 'auto';
	var posBottom = posY == 'auto' ? (windowHeight - e.pageY)  + 'px': 'auto';
	console.log('posX', posX, 'posY', posY, 'posBottom', posBottom);
	menu.css({'left':posX, 'top':posY, 'bottom': posBottom});

	$('body').append(menu);
	$(document).one('click', function(e){

		if (!$(e.target).hasClass('context-add-to-friends')){
			console.log('closing by click on ', e.target);
			cleanupContextMenu(300);
		}
	});
	return false;
});

// remove current context menu
$(document).on('contextmenu', function(e) {
	// cleanup
	var target = $(e.target);
	if (!target.hasClass('context-add-to-friends')){
		cleanupContextMenu(300);
	}
});

// send private message listener
$(document).on('click', 'body .chat-context-menu .send-private-message', function(e) {
	var target = $(e.target);
	if (!target.hasClass('send-private-message')){target = target.closest('.send-private-message');}
	var chatId = target.attr('data-chat-id');
	privateChatMessage(chatId);
	// cleanup
	cleanupContextMenu(300);
});

// add to friends listener
$(document).on('click', 'body .chat-context-menu .context-add-to-friends', function(e) {
	var target = $(e.target);
	if (target.hasClass('activated')){return false;}
	if (!target.hasClass('context-add-to-friends')){target = target.closest('.context-add-to-friends');}
	target.addClass('activated');

	var nickname = target.attr('data-chat-nick');

	// send api request to add to friends
	sendContextFriendshipRequest(nickname);
});



// show message in context menu
function showMessageInContextMenu($element, message, status){
	$element.removeClass('processing');
	$element.addClass(status);
	var messageText = tabData.serverAjaxResponces[message][settedlang];
	$element.text(messageText);
}

// request friendship by chat nickname
function sendContextFriendshipRequest(nickname){
	if (!nickname){return false;}

	var data = initFriendsAJAXData(),
		$element = $('body .context-add-to-friends');

	data.params.receiverNickname = nickname;

	if ($element.length){
		$element.addClass('processing');
	}

	var callback = function(callbackData){
		devInfo('context success callback');
		//show in context button

		showMessageInContextMenu($element, callbackData.message, 'success');
		// update friends system
		friendsFrameRenew();
		cleanupContextMenu();
	};
	var errorCallback = function(callbackData){
		devInfo('context error callback');
		//show error in context button
		showMessageInContextMenu($element, callbackData.message, 'failure');
		cleanupContextMenu();
	};

	$.ajax({
		url: urlPrefix + "/api/friendship/request-by-nick/",
		dataType: 'jsonp',
		data: data,
		success: function (returnedData) {
			devInfo('!!success!!', returnedData);
			callback(returnedData);
		},
		error: function(xhr, status, error) {
			devInfo('!!error!!', xhr, status, error);
			if (status){
				devInfo('error status', status);
			}
			if (error){
				devInfo('error data', error);
			}
			if (errorCallback){
				/*errorCallback(JSON.parse(error.responseText));*/
			}
		}
	});
}
