// Copyright (c) 2020 Siemens

/**
 * Display the icon associated with a given 'ViewModelObject'.
 *
 * @module js/aw-model-icon.directive
 */
import app from 'app';

/**
 * Display the icon associated with a given 'ViewModelObject'.
 *
 * @example <aw-model-icon vmo="[ViewModelObject]"></aw-model-icon>
 *
 * @memberof NgDirectives
 * @member aw-model-icon
 */
app.directive( 'awModelIcon', function() {
    return {
        restrct: 'E',
        scope: {
            vmo: '<',
            hideoverlay: '<'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-model-icon.directive.html'
    };
} );
