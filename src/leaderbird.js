/**
 *
 * A JavaScript implementation for the leaderbird.co APIs
 * Copyright 0plus1.com 2015-2016
 *
 * Distributed under the MIT Licence
 * See https://www.leaderbird.co for more information
 *
 * @type {y|exports|module.exports}
 */

// requires jsSHA
var jsSHA = require("jssha");

// leaderbird
leaderbird = function() {

    // Publicly overridable variables
    var _private_key = null;
    var _public_key = null;
    var _base_url = 'https://api.leaderbird.co';
    // Private variables
    var _auth_header_name = 'X-Authorization';
    var _date_header_name = 'X-RequestedAt';

    /**
     * Allows the user to set the options
     *
     * @param options
     */
    var setOptions = function( options )
    {
        _private_key = options.private_key;
        _public_key = options.public_key;

        if (options.base_url)
        {
            _base_url = options.base_url;
        }

        if (options.global_error_handler)
        {
            _globalErrorHandler = options.global_error_handler;
        }
    };

    /**
     * Collection of all allowed api calls.
     *
     * @type {{scores: {get: call.scores.get}, player: {register: call.player.register, register_anon: call.player.register_anon, get: call.player.get, score: call.player.score}, score: {submit: call.score.submit}, platforms: call.platforms, ping: call.ping}}
     */
    var call =
    {
        scores:
        {
            get: function(leaderboard_id, limit, timeframe, platform_id, onSuccess, onError)
            {
                var uri = 'leaderboard/'+leaderboard_id+'/scores/'+timeframe+'/'+limit;
                if (platform_id)
                {
                    uri = uri + '/'+platform_id;
                }
                _get(uri, onSuccess, onError);
            }
        },

        player:
        {
            register: function(username, onSuccess, onError)
            {
                var data = {'username': username };
                _post('player/register', data, onSuccess, onError);
            },
            register_anon: function(onSuccess, onError)
            {
                _post('player/register_anon', null, onSuccess, onError);
            },
            get: function(player_id, onSuccess, onError)
            {
                _get('player/'+player_id, onSuccess, onError);
            },
            score: function(leaderboard_id, player_id, type, timeframe, platform_id, onSuccess, onError)
            {
                var uri = 'leaderboard/'+leaderboard_id+'/player/'+player_id+'/score/'+type+'/'+timeframe;
                if (platform_id)
                {
                    uri = uri + '/'+platform_id;
                }
                _get(uri, onSuccess, onError);
            }
        },

        score:
        {
            submit: function(leaderboard_id, player_id, platform_id, score, onSuccess, onError)
            {
                var data = {'player_id': player_id, 'platform_id': platform_id, 'score': score };
                _post('leaderboard/'+leaderboard_id+'/score/submit', data, onSuccess, onError);
            }
        },

        platforms: function(onSuccess, onError)
        {
            _get('platforms', onSuccess, onError);
        },

        ping: function(onSuccess, onError)
        {
            _get('ping', onSuccess, onError);
        }
    }

    /**
     * GET Method for API
     *
     * @param uri
     * @param onSuccess
     * @param onError
     * @private
     */
    var _get = function (uri, onSuccess, onError) {
        _doRequest(uri, 'GET', null, onSuccess, onError);
    };

    /**
     *
     * POST Method for API
     *
     * @param uri
     * @param data
     * @param onSuccess
     * @param onError
     * @private
     */
    var _post = function (uri, data, onSuccess, onError)
    {
        _doRequest(uri, 'POST', data, onSuccess, onError);
    };

    /**
     * Actual request
     *
     * @param uri
     * @param type
     * @param data
     * @param onSuccess
     * @param onError
     * @private
     */
    var _doRequest = function(uri, type, data, onSuccess, onError)
    {
        // Initialise the request
        var timestamp = Math.floor( new Date().getTime() / 1000 );
        var request = new XMLHttpRequest();

        switch(type)
        {
            case 'GET':
                request.open('GET', _base_url+'/'+uri, true);
                break;
            case 'POST':
                request.open('POST',  _base_url+'/'+uri, true);
                request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                data = JSON.stringify(data);
                break;
        }

        request.setRequestHeader(_date_header_name, timestamp);
        request.setRequestHeader(_auth_header_name, _public_key+"."+_generateSignature(timestamp,uri));

        request.onload = function ()
        {
            if (request.status >= 200 && request.status < 400)
            {
                // Parse json and callback
                var data = JSON.parse(request.responseText); // IE9+
                onSuccess(data);
            }
            else
            {
                if( onError )
                {
                    onError(request);
                }
                else
                {
                    _globalErrorHandler(request);
                }
            }
        };

        request.onerror = function ()
        {
            _fatalErrorHandler();
        };

        request.send(data);
    };

    /**
     * Generates the signature for the request
     *
     * @param timestamp
     * @param endpoint
     * @returns {string}
     * @private
     */
    var _generateSignature = function(timestamp, endpoint)
    {
        var shaObj = new jsSHA("SHA-512", "TEXT");
        shaObj.setHMACKey(_private_key, "TEXT");
        shaObj.update(timestamp+endpoint+_public_key);
        return shaObj.getHMAC("HEX");
    };

    /**
     * Converts object to query string
     *
     * @param obj
     * @returns {string}
     * @private
     */
    var _toQueryString = function(obj)
    {
        var parts = [];
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
            }
        }
        return parts.join("&");
    }

    /**
     * Triggers on request.onerror.
     * There was a connection error of some sort
     * TODO investigate best way to handle these errors
     *
     * @private
     */
    var _fatalErrorHandler = function()
    {
        console.log('Unrecovable error.');
    }

    /**
     * Overridable
     *
     * @param request
     * @private
     */
    var _globalErrorHandler = function(request)
    {
        console.log('Error received with HTTP status code: '+request.status);
        console.log('Please refer to the API documentation.');
        console.log('Full request: ', request);
    };

    /**
     * Utility classes
     *
     * @type {{parseRequestErrorResponse: utils.parseRequestErrorResponse, addCommas: utils.addCommas}}
     */
    var utils =
    {
        /**
         * Parse the request error response
         * TODO Add more options for styling and displaying errors
         *
         * @param request
         */
        parseRequestErrorResponse: function(request)
        {
            var response = JSON.parse(request.response);
            return response;
        },

        /**
         * Make the score look nice
         *
         * @param nStr
         * @returns {string}
         */
        addCommas: function(nStr)
        {
            nStr += '';
            var x = nStr.split('.');
            var x1 = x[0];
            var x2 = x.length > 1 ? '.' + x[1] : '';
            var rgx = /(\d+)(\d{3})/;
            while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + ',' + '$2');
            }
            return x1 + x2;
        }
    }

    /**
     * Return only part of the leaderbird object. To simulate private methods in JS.
     *
     * @type {{setOptions: setOptions, call: {scores: {get: call.scores.get}, player: {register: call.player.register, register_anon: call.player.register_anon}, score: {submit: call.score.submit}, platforms: call.platforms}, utils: {parseRequestErrorResponse: utils.parseRequestErrorResponse, addCommas: utils.addCommas}}}
     */
    var oPublic =
    {
        setOptions: setOptions,
        call: call,
        utils: utils
    };
    
    return oPublic;

}();