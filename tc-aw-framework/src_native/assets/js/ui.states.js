// Copyright (c) 2020 Siemens

/**
 * This is the uiJs layer route/state contribution.
 *
 * @module js/ui.states
 */

var contribution = {
    // route to deal with handling checks for authentication.
    checkAuthentication: {
        templateUrl: '/html/login.html',
        controller: 'CheckAuthentication',
        noAuth: true,
        resolve: {
            authenticator: [ '$q', function( $q ) {
                return $q( function( resolve ) {
                    import( 'js/routeChangeHandler' ).then( function( rtChangeHandler ) {
                        resolve( rtChangeHandler.pickAuthenticator( $q ) );
                    } );
                } );
            } ],
            loadController: [ '$q', function( $q ) {
                return $q( function( resolve ) {
                    import( 'js/aw.checkAuthentication.controller' ).then( resolve );
                } );
            } ]
        }
    }
};

/**
 * @param {String} key - The key
 * @param {Promise} deferred - Promise
 * @returns {Object} contribution
 */
export default function( key, deferred ) {
    if( key === 'states' ) {
        if( deferred ) {
            deferred.resolve( contribution );
        } else {
            return contribution;
        }
    } else {
        if( deferred ) {
            deferred.resolve();
        }
    }
}
