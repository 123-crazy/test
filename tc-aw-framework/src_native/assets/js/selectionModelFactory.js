// Copyright (c) 2020 Siemens

/**
 * Selection model factory
 *
 * @module js/selectionModelFactory
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

// Factory definition
var exports = {};

/**
 * The UwSelectionModel type definition. A selection model contains a list of UIDs that are selected and has other
 * internal state information such as multi select state, selection mode, and selection status
 *
 * @param {String} mode - The initial selection mode. Defaults to 'single' if not provided.
 * @param {Function} tracker - The function used to track selection
 *
 * @class UwSelectionModel
 */
var UwSelectionModel = function( mode, tracker ) {
    var self = this;

    /**
     * The selection mode. Single or multiple. Defaults to single.
     *
     * @member mode
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     * @private
     */
    mode = mode ? mode : 'single';

    /**
     * Read only copy of internal selection mode. Modifications to this will not be reflected in the selection
     * model.
     *
     * @member mode
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     */
    self.mode = mode;

    /**
     * Whether selection model is currently in multi select mode. False initially.
     *
     * @member multiSelectEnabled
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     * @private
     */
    var multiSelectEnabled = false;

    /**
     * Read only copy of internal multi select state. Modifications to this will not be reflected in the selection
     * model.
     *
     * @member multiSelectEnabled
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     */
    self.multiSelectEnabled = multiSelectEnabled;

    /**
     * Whether selection is currently enabled. When false any selection updates will be ignored. True initially.
     *
     * @member selectionEnabled
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     * @private
     */
    var selectionEnabled = mode !== 'none';

    /**
     * The current selection state. none / some / all
     *
     * @member selectionState
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     * @private
     */
    var selectionState = 'none';

    /**
     * The UIDs that are currently selected.
     *
     * @member selected
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     * @private
     */
    var selected = [];

    /**
     * The selection states last time selection state was updated.
     *
     * @member lastSelectionState
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     * @private
     */
    var lastSelectionState = {};

    /**
     * Utility to fire events that update select all / deselect all command visibility
     */
    var notifySelectionState = function() {
        var canSelectLoaded = self.getCanExecuteSelectLoaded();
        var canDeselect = self.getCanExecuteDeselect();

        if( lastSelectionState.CanExecuteSelectLoaded !== canSelectLoaded ||
            lastSelectionState.CanExecuteDeselect !== canDeselect ) {
            lastSelectionState.CanExecuteSelectLoaded = canSelectLoaded;
            lastSelectionState.CanExecuteDeselect = canDeselect;

            eventBus.publish( 'CanExecuteSelectLoaded', {} );
            eventBus.publish( 'CanExecuteDeselect', {} );
        }
    };

    /**
     * Utility to exit multi select mode when selection is cleared
     */
    var checkResetMultiSelect = function() {
        // Disable multi select when all selection is cleared
        if( selected.length === 0 && !multiSelectEnabled ) {
            self.setMultiSelectionEnabled( false );
            selectionState = 'none';
        }
    };

    /**
     * Change selection mode
     *
     * @function setMode
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @param {Boolean} newMode - The new mode
     */
    self.setMode = function( newMode ) {
        // Toggle internal mode
        mode = newMode;
        // Update external (read only) mode
        self.mode = mode;
    };

    /**
     * Check if multi select mode is active
     *
     * @function isMultiSelectionEnabled
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @return {Boolean} Whether multi select mode is active
     */
    self.isMultiSelectionEnabled = function() {
        return multiSelectEnabled;
    };

    /**
     * Enable / disable multi select mode
     *
     * @function setMultiSelectionEnabled
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @param {Boolean} newMultiSelectState - The new multi select state
     */
    self.setMultiSelectionEnabled = function( newMultiSelectState ) {
        if( mode !== 'none' && multiSelectEnabled !== newMultiSelectState ) {
            if( newMultiSelectState && mode !== 'multiple' ) {
                logger.warn( 'Cannot enter multi select mode when selection model is single select' );
            } else {
                // Toggle internal multi select state
                multiSelectEnabled = newMultiSelectState;

                // Update the external (read only) state
                self.multiSelectEnabled = multiSelectEnabled;

                // Update select / deselect command visibility
                notifySelectionState();
            }
        }
    };

    /**
     * Check if selection is enabled
     *
     * @function isSelectionEnabled
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @return {Boolean} Whether selection is enabled
     */
    self.isSelectionEnabled = function() {
        return selectionEnabled;
    };

    /**
     * Enable / disable selection
     *
     * @function setSelectionEnabled
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @param {Boolean} isSelectionEnabled - Enable / disable selection state
     */
    self.setSelectionEnabled = function( isSelectionEnabled ) {
        if( mode !== 'none' ) {
            selectionEnabled = isSelectionEnabled;
        }
    };

    /**
     * Determine if select all loaded should be visible
     *
     * @function getCanExecuteSelectLoaded
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @return {Boolean} Whether select all loaded should be visible
     */
    self.getCanExecuteSelectLoaded = function() {
        // Visible when in multi select mode and not all objects are selected
        return mode === 'multiple' && selectionState !== 'all';
    };

    /**
     * Determine if clear selection should be visible
     *
     * @function getCanExecuteDeselect
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @return {Boolean} Whether deselect all should be visible
     */
    self.getCanExecuteDeselect = function() {
        // Visible when in multi select mode and everything is selected
        return mode === 'multiple' && selectionState === 'all';
    };

    /**
     * Determine the selection state (as it relates to data provider - none selected, some selected, all selected
     *
     * @function evaluateSelectionStatusSummary
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @param {UwDataProvider} dataProvider - The data provider to evaluate the selection state against.
     */
    self.evaluateSelectionStatusSummary = function( dataProvider ) {
        if( dataProvider ) {
            if( dataProvider.viewModelCollection ) {
                // Check of there's any objects in the data provider that aren't selected
                var loadedVmos = dataProvider.viewModelCollection.getLoadedViewModelObjects();
                var objectsNotSelected = loadedVmos.filter( function( x ) {
                    return !self.isSelected( x );
                } );
                // If everything is selected state is 'all'
                if( loadedVmos.length && objectsNotSelected.length === 0 ) {
                    selectionState = 'all';
                } else {
                    // Otherwise it's some / none depending on what is selected
                    selectionState = selected.length > 0 ? 'some' : 'none';
                }
            }
            // Update select / deselect command visibility
            notifySelectionState();
        } else {
            logger.error( 'No data provider given to evaluate selection status against. Data provider must now be passed to selectionModel.evaluateSelectionStatusSummary' );
        }
    };

    /**
     * Get the current selection (as UIDs)
     *
     * @function getSelection
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @return {String[]} List of uids that are selected
     */
    self.getSelection = function() {
        return selected;
    };

    /**
     * Set the current selection
     *
     * @function setSelection
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @param {String|String[]|Object|Object[]} newSelection - What to set as selection
     */
    self.setSelection = function( newSelection ) {
        // If selection is not disabled
        if( selectionEnabled ) {
            // Convert input to list of uids
            var uidList = exports.asTrackedList( newSelection, tracker );

            // Replace selection
            selected = uidList;

            // Auto exit multi select
            checkResetMultiSelect();
        }
    };

    /**
     * Add something to the current selection
     *
     * @function addToSelection
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @param {String|String[]|Object|Object[]} newSelection - What to add to selection. Can be single or multiple
     *            view model objects or uids
     */
    self.addToSelection = function( newSelection ) {
        // If selection is not disabled
        if( selectionEnabled ) {
            // Convert input to list of uids
            var uidList = exports.asTrackedList( newSelection, tracker );

            // Add to selection if not already in there
            selected = selected.concat( uidList.filter( function( uid ) {
                return selected.indexOf( uid ) === -1;
            } ) );
        }
    };
    /**
     * Remove something from the current selection
     *
     * @function removeFromSelection
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @param {String|String[]|Object|Object[]} newSelection - What to remove from selection. Can be single or
     *            multiple view model objects or uids
     */
    self.removeFromSelection = function( newSelection ) {
        // If selection is not disabled
        if( selectionEnabled ) {
            // Convert input to list of uids
            var uidList = exports.asTrackedList( newSelection, tracker );

            // Remove any uid that is in the list of uids from the selection
            selected = selected.filter( function( uid ) {
                return uidList.indexOf( uid ) === -1;
            } );

            checkResetMultiSelect();
        }
    };

    /**
     * Toggle the selection of something
     *
     * @function toggleSelection
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @param {String|String[]|Object|Object[]} newSelection - What to toggle the selection for. Can be single or
     *            multiple view model objects or uids
     */
    self.toggleSelection = function( newSelection ) {
        // If selection is not disabled
        if( selectionEnabled ) {
            // Convert input to list of uids
            var uidList = exports.asTrackedList( newSelection, tracker );

            // Get the list of uids that are selected / not selected
            var uidsNotSelected = uidList.filter( function( uid ) {
                return selected.indexOf( uid ) === -1;
            } );
            var uidsSelected = uidList.filter( function( uid ) {
                return selected.indexOf( uid ) !== -1;
            } );
            // Remove any objects were selected
            selected = selected.filter( function( uid ) {
                    return uidsSelected.indexOf( uid ) === -1;
                } )
                // And add the objects that were not selected
                .concat( uidsNotSelected );
            checkResetMultiSelect();
        }
    };

    /**
     * Get the number of items that are selected.
     *
     * @function getCurrentSelectedCount
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @return {Number} Number of selected objects
     */
    self.getCurrentSelectedCount = function() {
        return selected.length;
    };

    /**
     * Clear selection. Alias for setSelection([]). Does not fire the data provider event that tables expect.
     *
     * @function selectNone
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     */
    self.selectNone = function() {
        self.setSelection( [] );
    };

    /**
     * Check if the given object is selected
     *
     * @function isSelected
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @param {String|Object} obj - Obj to check selection state for
     *
     * @return {Boolean} Whether the object is selected
     */
    self.isSelected = function( obj ) {
        return self.getSelectedIndex( obj ) !== -1;
    };

    /**
     * Get the index of an object in selected array, if selected
     *
     * @function getSelectedIndex
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @param {String|Object} obj - Obj to check selection state for
     *
     * @return {Number} The index of an object in the selected array, if exists
     */
    self.getSelectedIndex = function( obj ) {
        var tracked = tracker ? tracker( obj ) : obj;
        return selected.indexOf( tracked );
    };

    /**
     * Get any objects in the list that are selected and sort them by their order in the selection model.
     *
     * @function getSortedSelection
     * @memberof module:js/selectionModelFactory~UwSelectionModel
     *
     * @param {String[]|Object[]} objList - List of objects to process to get selection
     *
     * @return {String[]|Object[]} Filtered and sorted list of objects
     */
    self.getSortedSelection = function( objList ) {
        // Get the selected objects
        return objList.filter( function( x ) {
                return self.isSelected( x );
            } )
            // And sort by the order in selection model
            .sort( function( a, b ) {
                var tracked = tracker ? tracker( a ) : a;
                var tracked2 = tracker ? tracker( b ) : b;
                return selected.indexOf( tracked ) - selected.indexOf( tracked2 );
            } );
    };

    // Old api functions that have moved or are no longer supported Including here in case some usage was missed /
    // added while CP was being promoted Will log an error/warning explaining how to fix

    // Still supported but split to make goal clearer
    self.addOrRemoveSelectedObjects = function( x, add ) {
        if( add ) {
            logger.warn( 'Please use selectionModel.addToSelection() instead of selectionModel.addOrRemoveSelectedObjects()' );
            self.addToSelection( x );
        } else {
            logger.warn( 'Please use selectionModel.removeFromSelection() instead of selectionModel.addOrRemoveSelectedObjects()' );
            self.removeFromSelection( x );
        }
    };

    // Still supported but renamed to make result clearer
    self.updateSelectedObjects = function( x ) {
        logger.warn( 'Please use selectionModel.setSelection() instead of selectionModel.updateSelectedObjects()' );
        self.setSelection( x );
    };

    // Not supported, moved to data provider
    self.selectAll = function() {
        logger.error( 'Selection model no longer supports selectAll as it does not contain model object list. Use dataProvider.selectAll() instead' );
    };
    self.changeObjectsSelection = function() {
        logger.error( 'Selection model no longer supports changeObjectsSelection as it does not contain model object list. Use dataProvider.changeObjectsSelection() instead' );
    };
    self.getSelectedObjects = function() {
        logger.error( 'Selection model no longer supports getSelectedObjects as it does not contain model object list. Use dataProvider.getSelectedObjects() instead' );
    };

    // Not supported (intentionally)
    self.updatePreSelectedObjects = function() {
        logger.error( 'Selection model no longer supports pre selection' );
    };
    self.getPreSelectedObjects = function() {
        logger.error( 'Selection model no longer supports pre selection' );
    };
};

/**
 * Create a new selection model to manage selection within a data provider.
 *
 * @param {String} selectionMode - The selection mode to use initially. Defaults to 'single' if not provided.
 * @param {Function} tracker - The function used to track selection.
 *
 * @return {UwSelectionModel} The newly created DeclDataProvider object.
 *
 * @memberof module:js/selectionModelFactory
 */
export let buildSelectionModel = function( selectionMode, tracker ) {
    return new UwSelectionModel( selectionMode, tracker );
};

/**
 * Utility to ensure input is a list of tracked objects.
 *
 * @param {String|String[]|Object|Object[]} newSelection - The input to convert to a list of tracked objects
 * @param {Object} tracker - (Optional) The 'tracker' for the collection.
 *
 * @return {String|String[]|Object|Object[]} Resulting selection.
 */
export let asTrackedList = function( newSelection, tracker ) {
    // Ensure it is array of some sort
    if( !_.isArray( newSelection ) ) {
        newSelection = [ newSelection ];
    }
    // Ensure everything in array is tracked
    return tracker ? newSelection.map( tracker ) : newSelection;
};

/**
 * Synchronously execute the 'setSelection' API on the given {UwSelectionModel} object.
 *
 * @param {UwSelectionModel} selectionModel - The {UwSelectionModel} object to set the selection on.
 * @param {String|String[]|Object|Object[]} newSelection - What to set as selection
 */
export let setSelection = function( selectionModel, newSelection ) {
    selectionModel.setSelection( newSelection );
};

exports = {
    buildSelectionModel,
    asTrackedList,
    setSelection
};
export default exports;
/**
 * This factory creates 'UwSelectionModel' objects used within data providers
 *
 * @memberof NgServices
 * @member selectionModelFactory
 *
 * @return {selectionModelFactory} Reference to service API object.
 */
app.factory( 'selectionModelFactory', () => exports );
