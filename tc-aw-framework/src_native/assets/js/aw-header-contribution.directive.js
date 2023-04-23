// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-header-contribution.directive
 */
import * as app from 'app';

/**
 * Definition for the (aw-header-contribution) directive.
 *
 * @example
 * <aw-header-contribution>
 *     <div>header contribution property goes here</div>
 * </aw-header-contribution>
 *
 * @member aw-header-contribution
 * @memberof NgElementDirectives
 */
app.directive( "awHeaderContribution", [ function() {
    return {
        restrict: "E",
        transclude: true,
        template: '<div class="aw-layout-flexRow aw-layout-headerProperty" data-ng-transclude></div>'
    };
} ] );
