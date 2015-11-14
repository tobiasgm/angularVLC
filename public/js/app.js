angular.module('angularVLC', ['ui.router'])

    .constant('serverinfo', {
        url: 'http://localhost:8080/',
        authdata: ':test',
        path: '/Users/tobias/music/'
    })

    // provide app routes and interceptor to inject http headers
    .config ([
        '$stateProvider',
        '$urlRouterProvider',
        '$httpProvider',
        'serverinfo',
        function($stateProvider, $urlRouterProvider, $httpProvider, serverinfo) {

            $httpProvider.interceptors.push('httpRequestInterceptor');
            
            $stateProvider
                .state('main', {
                    url: '/main',
                    templateUrl: '/main.html',
                    controller: 'PlaybackController',
                    resolve: {
                        vlcBrowse: ['vlcControl', function(vlcControl){
                            return vlcControl.browse(serverinfo.path);
                        }],
                        vlcPLaylist: ['vlcControl', function(vlcControl){
                            return vlcControl.playlist();
                        }]
                   }
                })
                .state('about', {
                    url: '/about',
                    templateUrl: '/about.html',
                    controller: 'aboutController',
                    
                })
                .state('error', {
                    url: '/error',
                    templateUrl: '/error.html',
                    controller: 'errorController',
                  
                });
            
            // redirect unspecified routes    
            $urlRouterProvider.otherwise('main');
        },   
    ])

    // inject custom http headers
    .factory('httpRequestInterceptor', function (Base64, serverinfo) {
        return {
            request: function (config) {

                var authdata = Base64.encode(serverinfo.authdata);
                
                // use this to destroying other existing headers
                //config.headers = {'Authentication':'authentication'}
                
                // use this to prevent destroying other existing headers
                config.headers['Authorization'] =  'Basic ' + authdata;

                // 
                config.useXDomain = true;
                
                return config;
            }
        };
    })

     // run the vlc status poller
    .run(function(vlcPoller) {
        vlcPoller.poller();
    })

     // continuously poll for vlc status
    .factory('vlcPoller', function($http, $timeout,$location, serverinfo, vlcControl) {
        
        var p = { data:[], calls:0, resp:[] };
        
        p.poller = function() {
            $http.get(serverinfo.url+'requests/status.json').then(function(r) {
                //console.log(r);
                angular.copy(r,p.resp);
                p.calls++;
                if ($location.path() == '/error')
                    $location.path('/main');
                $timeout(p.poller, 500);
            }, function(r) {
                //console.log(r);
                angular.copy(r,p.resp);
                if ($location.path() == '/main')
                    $location.path('/error');
                $timeout(p.poller, 5000);
            });
            
        };
        
        p.poller();
        
        return p;
    })

    .factory('vlcControl',['$http','serverinfo', function($http, serverinfo) {
       
        var s = { dir:[], pl:[] };

        var successCallback = function() {
        }
        var errorCallback = function() {
        }
        
        // > add <uri> to playlist:
        //?command=in_enqueue&input=<uri>
        s.pl_add = function(uri) {
            return $http.get(serverinfo.url+'requests/status.json?command=in_enqueue&input='+uri).then (function() { s.playlist() }, errorCallback);
        };

        //> add subtitle to currently playing file
        //?command=addsubtitle&val=<uri>
        s.addSubtitle = function(uri) {
            return $http.get(serverinfo.url+'requests/status.json?command=addsubtitle&val='+ur).then(successCallback, errorCallback);
        };

        // > play playlist item <id>.
        // Manual says: "If <id> is omitted, play last active item:" -> Does not seem to work, therefore added test for id value
        // ?command=pl_play&id=<id>
        s.play = function(id) {
            if (id == undefined) {
                return $http.get(serverinfo.url+'requests/status.json?command=pl_play').then(successCallback, errorCallback);
            } else {
                return $http.get(serverinfo.url+'requests/status.json?command=pl_play&id='+id).then(successCallback, errorCallback);
            }      
        };

        // > toggle pause. If current state was 'stop', play item <id>, if no <id> specified, play current item.
        // If no current item, play 1st item in the playlist:
        // ?command=pl_pause&id=<id>
        s.pause = function(id) {
            return $http.get (serverinfo.url+'requests/status.json?command=pl_pause&id='+id).then(successCallback, errorCallback);
        };

        // > resume playback if paused, else do nothing
        // ?command=pl_forceresume
        s.resume = function() {
            return $http.get(serverinfo.url+'requests/status.json?command=pl_forceresume').then(successCallback, errorCallback);
        };

        // > pause playback, do nothing if already paused
        // ?command=pl_forcepause
        s.forcepause = function() {
            return $http.get(serverinfo.url+'requests/status.json?command=pl_forcepause').then(successCallback, errorCallback);
        };

        // > stop playback:
        // ?command=pl_stop
        s.stop = function() {
            return $http.get(serverinfo.url+'requests/status.json?command=pl_stop').then(successCallback, errorCallback);
        };

        // > jump to previous item:
        // ?command=pl_previous
        s.previous = function() {
            return $http.get(serverinfo.url+'requests/status.json?command=pl_previous').then(successCallback, errorCallback);
        };

        // > jump to next item:
        //  ?command=pl_next
        s.next = function() {
            return $http.get(serverinfo.url+'requests/status.json?command=pl_next').then(successCallback, errorCallback);
        };

        // > delete item <id> from playlist:
        //  ?command=pl_delete&id=<id>
        //  NOTA BENE: pl_delete is completly UNSUPPORTED
        s.pl_delete = function(id) {
            return $http.get(serverinfo.url+'requests/status.json?command=pl_delete&id='+id).then (function() { s.playlist() }, errorCallback);
        };

        // > empty playlist:
        // ?command=pl_empty
        s.pl_empty = function() {
            return $http.get(serverinfo.url+'requests/status.json?command=pl_empty').then (function() { s.playlist() }, errorCallback);
        };

        // > toggle random playback:
        // ?command=pl_random
        s.random = function() {
            return $http.get(serverinfo.url+'requests/status.json?command=pl_random').then(successCallback, errorCallback);
        };

        // > toggle loop:
        // ?command=pl_loop
        s.loop = function() {
            return $http.get(serverinfo.url+'requests/status.json?command=pl_loop').then(successCallback, errorCallback);
        };
        
        // > toggle repeat:
        //  ?command=pl_repeat
        s.repeat = function() {
            return $http.get(serverinfo.url+'requests/status.json?command=pl_repeat').then(successCallback, errorCallback);
        };

        // get playlist
        s.playlist = function() {
            return $http.get(serverinfo.url+'requests/playlist.json').then (function(response) {
                angular.copy(response.data,s.pl);
                console.log(s.pl)
            }, errorCallback);
        };
        
        // browse dir
        s.browse = function(dir) {
            return $http.get(serverinfo.url+'requests/browse.json?dir='+dir).then (function(response) {
                angular.copy(response.data,s.dir);
                console.log(s.dir)
            }, errorCallback);
        };
        
        return s;
    }])

    .controller('PlaybackController',[
        '$scope',
        'vlcControl',
        'vlcPoller',
        '$http',
        '$interval',
        function($scope, vlcControl, vlcPoller, $http, $interval) {
            $scope.dir = vlcControl.dir;
            $scope.pl = vlcControl.pl;
            $scope.resp = vlcPoller.resp;
            $scope.predicate = 'name';
            $scope.reverse = false;
            $scope.search = 'flac';

            $scope.order = function(predicate) {
                $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
                $scope.predicate = predicate;
            };

            $scope.filterFunction = function(element) {
                if ($scope.isDir(element.type))
                    return true;
                else
                    return element.name.match(/\.(mp3|flac)$/i) ? true : false;
            };
            
            
            $scope.ext = function(filename) {
                return filename.split('.').pop();
            }
            
            $scope.pl_add = function(uri) {
                vlcControl.pl_add(uri);          
            };

            $scope.pl_delete = function(id) {
                vlcControl.pl_delete(id);           
            };
                     
            $scope.play = function(id) {
                vlcControl.play(id);        
            };          
            
            $scope.pause = function() {
                vlcControl.pause();
            };
            
            $scope.stop = function() {
                vlcControl.stop();
            };
            
            $scope.prev = function() {
                console.log(vlcControl.previous());
            };
            
            $scope.next = function() {
                console.log(vlcControl.next());   
            };

            $scope.loop = function() {
                vlcControl.loop();  
            };

            $scope.random = function() {
                vlcControl.random();     
            };

            $scope.browse = function(path) {
                vlcControl.browse(path);
            };

            $scope.isFile = function(type) {
                if (type == 'file') return true;
                return false;
            };

            $scope.isDir = function(type) {
                if (type == 'dir') return true;
                return false;
            };

            $scope.isPlaying = function(state) {
                if (state == undefined) return false;
                if (state == 'playing') return true;
                return false;
            };

            $scope.isPaused = function(type) {
                if (state == undefined) return false;
                if (state == 'paused') return true;
                return false;
            };
            
        }])

    .controller('errorController',[
        '$scope',
        'vlcControl',
        'vlcPoller',
        '$http',
        '$interval',
        function($scope, vlcControl, vlcPoller, $http, $interval) {
            $scope.data = vlcPoller.data;
            $scope.resp = vlcPoller.resp;
        }])

    .controller('aboutController',[
        '$scope',
        'vlcControl',
        'vlcPoller',
        '$http',
        '$interval',
        function($scope, vlcControl, vlcPoller, $http, $interval) {

        }])
            

    .factory('Base64', function () {
        /* jshint ignore:start */
        
        var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        
        return {
            encode: function (input) {
                var output = "";
                var chr1, chr2, chr3 = "";
                var enc1, enc2, enc3, enc4 = "";
                var i = 0;
                
                do {
                    chr1 = input.charCodeAt(i++);
                    chr2 = input.charCodeAt(i++);
                    chr3 = input.charCodeAt(i++);
                    
                    enc1 = chr1 >> 2;
                    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                    enc4 = chr3 & 63;
                    
                    if (isNaN(chr2)) {
                        enc3 = enc4 = 64;
                    } else if (isNaN(chr3)) {
                        enc4 = 64;
                    }
                    
                    output = output +
                        keyStr.charAt(enc1) +
                        keyStr.charAt(enc2) +
                        keyStr.charAt(enc3) +
                        keyStr.charAt(enc4);
                    chr1 = chr2 = chr3 = "";
                    enc1 = enc2 = enc3 = enc4 = "";
                } while (i < input.length);
                
                return output;
            },
            
            decode: function (input) {
                var output = "";
                var chr1, chr2, chr3 = "";
                var enc1, enc2, enc3, enc4 = "";
                var i = 0;
                
                // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
                var base64test = /[^A-Za-z0-9\+\/\=]/g;
            if (base64test.exec(input)) {
                window.alert("There were invalid base64 characters in the input text.\n" +
                             "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
                             "Expect errors in decoding.");
            }
                input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
                
                do {
                    enc1 = keyStr.indexOf(input.charAt(i++));
                    enc2 = keyStr.indexOf(input.charAt(i++));
                    enc3 = keyStr.indexOf(input.charAt(i++));
                    enc4 = keyStr.indexOf(input.charAt(i++));
                    
                    chr1 = (enc1 << 2) | (enc2 >> 4);
                    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                    chr3 = ((enc3 & 3) << 6) | enc4;
                    
                    output = output + String.fromCharCode(chr1);
                    
                    if (enc3 != 64) {
                        output = output + String.fromCharCode(chr2);
                    }
                    if (enc4 != 64) {
                        output = output + String.fromCharCode(chr3);
                    }
                    
                    chr1 = chr2 = chr3 = "";
                    enc1 = enc2 = enc3 = enc4 = "";
                    
                } while (i < input.length);
                
                return output;
            }
        };
        
        /* jshint ignore:end */
    });
