// Copyright (c) 2020 Siemens

/**
 * A decorator for the location service that adds the ability to capture and release $locationChangeSuccess events.
 * Moved into a separate file to support testing.
 *
 * @module js/location.decorator
 */

export let decorate = function( locationService, rootScopeService ) {
    /**
     * Whether the $location service is currently caching any $locationChangeSuccess events
     */
    locationService.$$shouldCache = false;

    /**
     * The last $locationChangeSuccess event that was cached. Fired when $location.releaseSuccess is called.
     */
    locationService.$$cachedSuccess = null;

    /**
     * Set up the listener for the $locationChangeSuccess event. This will be the first listener and can prevent
     * the event from reaching any other listeners.
     */
    rootScopeService.$on( '$locationChangeSuccess', function( e, newUrl, oldUrl, newState, oldState ) {
        //If activeElement is null that means whatever element was previously focused has been removed from the page
        //Ex search was done and location changed
        //Becuase IE11 is weird the next element click will not trigger a "click" event until something else on the page is clicked
        //Workaround is to force reset focus back to body (the default focus) whenever this case happens
        if( !document.activeElement ) {
            document.body.focus();
        }
        if( locationService.$$shouldCache ) {
            e.preventDefault();
            locationService.$$cachedSuccess = {
                newUrl: newUrl,
                oldUrl: oldUrl,
                newState: newState,
                oldState: oldState
            };
        }
    } );

    /**
     * Capture any success events that are fired and cache them.
     */
    locationService.captureSuccess = function() {
        this.$$shouldCache = true;
        return this;
    };

    /**
     * Fire any cached success event and stop catching the success events.
     */
    locationService.releaseSuccess = function() {
        this.$$shouldCache = false;
        if( this.$$cachedSuccess ) {
            rootScopeService.$broadcast( '$locationChangeSuccess', this.$$cachedSuccess.newUrl,
                this.$$cachedSuccess.oldUrl, this.$$cachedSuccess.newState, this.$$cachedSuccess.oldState );
            this.$$cachedSuccess = null;
        }
        return this;
    };

    /**
     * Clear any success event that is currently cached.
     */
    locationService.dumpSuccess = function() {
        this.$$cachedSuccess = null;
        return this;
    };

    return locationService;
};

export default [
    '$delegate',
    '$rootScope',
    function( $delegate, $rootScope ) {
        return decorate( $delegate, $rootScope );
    }
];
