// Copyright (c) 2020 Siemens

/**
 * This directive is used as place-holder to show sample usage of declarative elements
 *
 * @module js/wys-preview.directive
 * @param {string} view - Path of view.html file with usage of declarative elements
 * @param {string} viewModel - Path of viewModel.json file for declarative elements
 * @example <wys-preview view="view.html" view-model="viewModel.json" style="display:flex;"></wys-preview>
 */
import app from 'app';
import 'js/wys-canvas-container.directive';
import 'js/wys-preview.controller';

/**
 * Display example .
 *
 * @example <wys-preview view="(url of view template HTML)" view-model="(URL of viewModel JSON)"></wys-preview>
 * @memberof NgDirectives
 * @member wys-preview
 */
app.directive( 'wysPreview', [
    function() {
        return {
            restrict: 'E',
            controller: 'wysPreviewCtrl',
            templateUrl: app.getBaseUrlPath() + '/html/wys-preview.directive.html'
        };
    }
] );
