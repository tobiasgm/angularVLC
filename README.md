angularVLC
===========
Experimental http remote control for VLC implemented in Angular 1.5.

Setup
-----
Avtivate VLC http server according to https://wiki.videolan.org/documentation:modules/http_intf/

Set the LUA http password to "test" and point the source folder to the folder where this app is located.

There`s some challenges to get this to work. The vlc LUA server does not send CORS-headers, so this control must reside on the LUA server. 

The problem is that there`s some issues with the LUA server, serving angular/ jquery files. Workaround: Serve these files from another server/CDN.

Todo
----
- Fix 'Access-Control-Allow-Origin' problem
- Better error handling  
- Click to scan in track  
- Clickable volume bar  
- Nice layout..  
