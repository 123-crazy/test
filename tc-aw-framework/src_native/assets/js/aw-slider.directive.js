// Copyright (c) 2020 Siemens

/**
 * Slider widget
 *
 * @module js/aw-slider.directive
 */
import app from 'app';
import 'js/aw-slider.controller';
import 'js/aw-property-image.directive';

/**
 * Directive to display a slider widget
 *
 * @example <aw-slider prop="data.xxx" ></aw-slider>
 *
 * @member aw-slider
 * @memberof NgElementDirectives
 */
app.directive( 'awSlider', [ function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '='
        },
        controller: 'awSliderController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-slider.directive.html',
        replace: true
    };
} ] );
