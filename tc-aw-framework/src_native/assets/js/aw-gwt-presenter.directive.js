// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define  */

/**
 * Temporary file to support declarative stylesheet support for custom panels.
 *
 * @module js/aw-gwt-presenter.directive
 */
import * as app from 'app';

/**
 * @member aw-gwt-presenter
 * @memberof NgElementDirectives
 */
app.directive( 'awGwtPresenter', [
    function() {
        return {
            restrict: 'E',
            scope: {
                type: '@',
                data: '=?', //Not all presenters need data so data is optional
                presenter: '=?', //Can manually pass a presenter instead of a type
                onSlotChange: '=?' //Function to run after the presenter has been set in slot
            },
            link: function() {
                // do nothing
            }
        };
    }
] );
