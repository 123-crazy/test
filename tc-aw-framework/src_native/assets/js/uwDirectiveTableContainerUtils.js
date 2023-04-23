// Copyright (c) 2020 Siemens

/**
 * Overall fill down processing flow. This is basically convenience logic that allows a copy & paste, paste, paste to a
 * range.
 * <P>
 *
 * General Steps
 * <P>
 * 1) During hover on an editable cell show the drag handle UI to allow the user to start a drag.
 * <P>
 * 2) Leverage the Hammer Pan event handler to capture drag events on the drag handle.
 * <P>
 * limit the drag selection area to within the column (same property). So vertical only. 3) At the end of the drag
 * action, cleanup/remove the Hammer event handler
 * <P>
 * 4) The drag "range" includes a source cell (start point), and a set of one or more target cells.
 * <P>
 * 5) Need to get the UW (Universal Widget) instances created for the drag range - they may already be UWs or not, so
 * track instance counting. Trigger creation of the UW for any cell which is not already a UW. This is async, so a
 * Promise is used. need the UW so we can get the cell data context (property info) via the scope.
 * <P>
 * 6) When all the cells have UWs created a promise is used to trigger next step.
 * <P>
 * 7) Once all the drag cells have UWs we can get the property info value from the cell Ng scope. the source cell has
 * the "original values" (db & ui) that we want to push to the rest of the range.The target cells scope property can
 * then be set with the db and ui values from the source cell.Read-only cells must be skipped.
 * <P>
 * 8) once the cell property value is set, we need to trigger equivalent "leave cell" ui gestures to allow the ui to
 * update the cell to it's updated and dirty value. eg blur()
 *
 * @module js/uwDirectiveTableContainerUtils
 *
 * Note: This module wraps the aw-drag directive for gwt table. It can be removed once we stop using gwt table.
 */
import ngModule from 'angular';
import ngUtils from 'js/ngUtils';
import logger from 'js/logger';
import 'js/aw.table.container.controller';
import 'js/aw-drag.directive';

var exports = {};

/**
 * initModuleController ('bootstrap') the angular system and create an angular controller given the 'parent'
 * element.
 *
 * @param {Element} parent - The DOM element the controller and 'inner' HTML content will be added to.
 *            <P>
 *            Note: All existing 'child' elements of this 'parent' will be removed.
 *
 * @param {Object} containerVM - compare container View Model
 *            <P>
 *            Note: This object will have the 'rootScopeElement' property set on this object with the new AngularJS
 *            Element created to hold the compiled given 'innerHtml' and attached as a child to the given
 *            'parentElement'.
 */
export let initModuleController = function( parent, containerVM ) {
    if( parent ) {
        var ctrlFn = ngUtils.include( parent.parentElement, parent );
        if( ctrlFn ) {
            ctrlFn.setContainerVM( containerVM );
        }
    }
};

/**
 * Forcing digest cycle - manually triggers an Ng Compile as the DOM is updated dynamically when GWT replaces the
 * cell content during render updates.
 *
 * @param {Element} parent - The element above the element the controller was created on.
 */
export let forceDigestCycle = function( parent ) {
    var contrNgElement = ngModule.element( parent );

    if( contrNgElement ) {
        var ngScope = contrNgElement.scope();
        if( ngScope && !ngScope.$$destroyed ) {
            var docNgElement = ngModule.element( document.body );
            var docInjector = docNgElement.injector();
            var compileFn = docInjector.get( '$compile' );

            if( compileFn ) {
                var compiledFn = compileFn( contrNgElement );

                var ctrlScope = contrNgElement.scope();

                if( ctrlScope && compiledFn ) {
                    var lastVM = ctrlScope.containerVM;
                    var compiledElt = compiledFn( ctrlScope );
                    var newScope = ngModule.element( compiledElt ).scope();
                    // push the VM ref on to the new scope???
                    if( lastVM ) {
                        var existing = newScope.containerVM;
                        if( !existing ) {
                            newScope.containerVM = lastVM;
                        }
                    }
                }
            }
        }
    } else {
        logger.error( 'ERROR Unable to relocate angular controller on \'parent\' element  TableController' );
    }
};

exports = {
    initModuleController,
    forceDigestCycle
};
export default exports;
