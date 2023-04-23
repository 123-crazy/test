// Copyright (c) 2020 Siemens

/**
 * View model collection factory
 *
 * @module js/viewModelCollectionFactory
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import viewModelObjectSvc from 'js/viewModelObjectService';
import uwPropertySvc from 'js/uwPropertyService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';

// eslint-disable-next-line valid-jsdoc

/**
 * {Number} The debug ID of the 'next' instance of a certain class.
 */
var _debug_nextId = {
    viewModelCollection: 0
};

/**
 * {Number} The current number of 'active' instances of a certain class.
 */
var _debug_currentCount = {
    viewModelCollection: 0
};

/**
 * {Boolean} TRUE if create/destroy events should be logged for all non-dataProvider objects from this
 * service.
 */
var _debug_logMiscModelLifeCycle = false;

/**
 * Based on the given uid this function retrieves the IModelObject instance from the ClientDataModel and
 * creates a new instance of a ViewModelObject based on the model object passed in.
 *
 * @param {String} uid - ID of the new ViewModelObject.
 *
 * @return {ViewModelObject} New ViewModelObject (or NULL if no match was found in the ClientDataModel).
 */
function _createViewModelObject( uid ) {
    if( uid ) {
        return viewModelObjectSvc.createViewModelObject( uid, 'EDIT' );
    }

    return null;
}

/**
 * Class used to maintain data for various DataProviders.
 *
 * @param {String} name of the viewModelCollection
 * @constructor ViewModelCollection
 */
var ViewModelCollection = function( name ) {
    var self = this;

    /**
     * Name of this view model collection (usually the same as the dataprovider name)
     */
    self.name = name;

    /**
     * Array of ViewModelObjects currently being managed in this 'virtual' collection.
     */
    self.loadedVMObjects = [];

    /**
     * The number of ViewModelObjects currently in this 'virtual' collection (should be same as length of
     * 'loadedVMObjects').
     */
    self.totalObjectsLoaded = 0;

    /**
     * The number of ViewModelObjects possible in this 'virtual' collection.
     */
    self.totalFound = 0;

    /**
     * {SubDefArray} Collection of eventBus subscription definitions.
     */
    var _eventBusSubDefs = [];

    /**
     * {String} Topic to publish for each 'cdm.new' event.
     */
    var _eventTopicNew = 'vmc.new.' + self.name;

    /**
     * {String} Topic to publish for each 'cdm.modified.' event.
     */
    var _eventTopicModified = 'vmc.modified.' + self.name;

    /**
     * {Object} Cached (shared) data object to publish for 'vmc.new.xxx' events.
     */
    var _eventDataNew = {
        vmc: self,
        newObjects: null
    };

    /**
     * {Object} Cached (shared) data object to publish for 'vmc.modified.xxx' events.
     */
    var _eventDataModified = {
        vmc: self,
        modifiedObjects: null
    };

    /**
     * Updates the loaded objects array and total objects loaded counter.
     *
     * @param {Array} results - Array of model objects or objects
     *
     * @param {String} uidInResponse - if response object doesn't have uid at top level, then this attribute
     *            should specify the level where uid is available. Example:
     *
     * <pre>
     *    responseObject: {
     *        test: {
     *            uid: 'AAAAAAAA'
     *        }
     *    },
     *    uidInResponse: 'test.uid'
     * </pre>
     *
     * @param {Boolean} preSelection - if the objects should inherit 'selected' status
     *
     * @param {Boolean} prepend - Insert Before current start index. (optional)
     *
     * @memberof ViewModelCollection
     */
    self.updateModelObjects = function( results, uidInResponse, preSelection, prepend ) {
        var actualResults = results.objects || results;

        if( !_.isEmpty( actualResults ) ) {
            var preprendVMObjects = [];

            _.forEach( actualResults, function( object ) {
                var vmObject = null;
                var uid = null;

                if( results.objects ) {
                    uid = object.uid;
                    vmObject = viewModelObjectSvc.createViewModelObject( uid, 'EDIT', null, object );
                } else if( object.uid ) { // Retrieve object's UID
                    uid = object.uid;

                    var modelObj = cdm.getObject( uid );

                    // If object is there in the CDM, convert it to VM object
                    if( modelObj ) {
                        if( viewModelObjectSvc.isViewModelObject( object ) || object.dataMapper ) {
                            // if VMObject is passed, use it directly instead of creating again
                            vmObject = object;
                        } else {
                            // Get underlying target object's UID if 'awp0Target' property exists
                            if( modelObj.props && modelObj.props.awp0Target ) {
                                uid = modelObj.props.awp0Target.dbValues[ 0 ];
                            }

                            vmObject = _createViewModelObject( uid );
                        }
                    } else {
                        // If object is not there in the CDM, it is a VM object
                        vmObject = object;
                    }
                } else if( uidInResponse ) { // if object doesn't have any UID, then retrieve the UID from the structure provided
                    uid = _.get( object, uidInResponse );

                    vmObject = _createViewModelObject( uid );
                } else { // for static objects
                    vmObject = object;
                }

                if( vmObject && !prepend ) {
                    if( preSelection && !_.isUndefined( object.selected ) ) {
                        vmObject.selected = object.selected;
                    }

                    self.loadedVMObjects.push( vmObject );
                }

                if( vmObject && prepend ) {
                    if( preSelection && !_.isUndefined( object.selected ) ) {
                        vmObject.selected = object.selected;
                    }

                    preprendVMObjects.push( vmObject );
                }

                // update total count for loaded objects
                self.totalObjectsLoaded++;
            } );

            if( !_.isEmpty( preprendVMObjects ) ) {
                self.loadedVMObjects = preprendVMObjects.concat( self.loadedVMObjects );
            }

            // if moreValuesExist of the LOV results,
            if( actualResults.moreValuesExist ) {
                self.moreValuesExist = actualResults.moreValuesExist;
            }
        }
    };

    /**
     * @param {ObjectArray} viewModelObjects - The array to set as the currently loaded view model objects
     *            being managed within this viewModelCollection.
     */
    self.setViewModelObjects = function( viewModelObjects ) {
        self.totalObjectsLoaded = viewModelObjects.length;
        self.loadedVMObjects = viewModelObjects;
    };

    /**
     * Returns view model object at specified index.
     *
     * @param {Number} index - specified index
     * @return {Object} Null or object at given index
     * @memberof ViewModelCollection
     */
    self.getViewModelObject = function( index ) {
        if( self.loadedVMObjects ) {
            return self.loadedVMObjects[ index ];
        }
        return null;
    };

    /**
     * Returns view model objects with the specified id (can be uid).
     *
     * @param {String} id - specific id of the view model object
     * @return {Array} Empty or with view model objects found
     * @memberof ViewModelCollection
     */
    self.getViewModelObjects = function( id ) {
        var returnViewModelObjects = [];

        _.forEach( self.loadedVMObjects, function( vmo ) {
            if( id === vmo.getId() ) {
                returnViewModelObjects.push( vmo );
            }
        } );

        return returnViewModelObjects;
    };

    /**
     * Set total objects found
     *
     * @param {Number} totalFound - total found
     * @memberof ViewModelCollection
     */
    self.setTotalObjectsFound = function( totalFound ) {
        self.totalFound = totalFound;
    };

    /**
     * Return total objects found
     *
     * @memberof ViewModelCollection
     *
     * @returns {Number} Total objects found.
     */
    self.getTotalObjectsFound = function() {
        return self.totalFound;
    };

    /**
     * Return total unique objects found, unique by id.
     *
     * @memberof ViewModelCollection
     *
     * @returns {Number} Total unique objects found, unique by id.
     */
    self.getTotalUniqueObjectsLoaded = function() {
        var uniqueUids = {};

        _.forEach( self.loadedVMObjects, function( vmo ) {
            if( vmo.getId ) {
                uniqueUids[ vmo.getId() ] = null;
            }
        } );

        // return totalObjectsLoaded if no ids were found on the objects
        return Object.keys( uniqueUids ).length || self.totalObjectsLoaded;
    };

    /**
     * Return True/False if there are more objects to be loaded.
     *
     * @memberof ViewModelCollection
     *
     * @return {Boolean} True/False if there are more objects to be loaded.
     */
    self.hasMoreObjectsToLoad = function() {
        return self.getTotalUniqueObjectsLoaded() < self.getTotalObjectsFound();
    };

    /**
     * To support infinite scroll, if total found are greater than loaded objects then return
     * totalObjectsLoaded + 3 else return total objects loaded
     *
     * @memberof ViewModelCollection
     *
     * @return {Number} Total objects loaded
     */
    self.getVirtualLength = function() {
        var retValue = self.totalObjectsLoaded;

        if( self.totalObjectsLoaded > 0 && self.hasMoreObjectsToLoad() ) {
            retValue += 3;
        }

        return retValue;
    };

    /**
     * Returns total objects loaded
     *
     * @memberof ViewModelCollection
     *
     * @return {Number} total objects loaded
     */
    self.getTotalObjectsLoaded = function() {
        return self.totalObjectsLoaded;
    };

    /**
     * Reset loaded objects array and total objects loaded counter
     *
     * @memberof ViewModelCollection
     */
    self.clear = function() {
        self.loadedVMObjects = [];
        self.totalObjectsLoaded = 0;
        self.totalFound = 0;
    };

    /**
     * Return loaded view model objects
     *
     * @memberof ViewModelCollection
     * @return {Array} loaded view model objects
     */
    self.getLoadedViewModelObjects = function() {
        return self.loadedVMObjects;
    };

    /**
     * Get all the editable properties
     *
     * @return {ViewModelPropertyArray} Collection of editable properties.
     */
    self.getAllEditableProperties = function() {
        var allEditableProperties = [];

        _.forEach( self.loadedVMObjects, function( vmo ) {
            _.forEach( vmo.props, function( prop ) {
                if( prop.isEditable ) {
                    allEditableProperties.push( prop );
                }
            } );
        } );

        return allEditableProperties;
    };

    /**
     * Get all the modified properties
     *
     * @return {ViewModelPropertyArray} Collection of modified properties.
     */
    self.getAllModifiedProperties = function() {
        var allModifiedProperties = [];

        _.forEach( self.loadedVMObjects, function( vmo ) {
            _.forEach( vmo.props, function( prop ) {
                if( uwPropertySvc.isModified( prop ) ) {
                    allModifiedProperties.push( {
                        property: prop,
                        viewModelObject: vmo
                    } );
                }
            } );
        } );

        return allModifiedProperties;
    };

    /**
     * Check editability on all properties
     */
    self.checkEditableOnProperties = function() {
        _.forEach( self.loadedVMObjects, function( vmo ) {
            viewModelObjectSvc.updateVMOProperties( vmo );
        } );
    };

    /**
     * Reset all 'editable' status properties from the underlying object.
     */
    self.clearEditiableStates = function() {
        _.forEach( self.loadedVMObjects, function( vmo ) {
            vmo.clearEditiableStates( true );
        } );

        uwPropertySvc.triggerDigestCycle();
    };

    /**
     * Returns 1st ViewModelObject index in the collection whose 'id' (or 'uid') matches specified value.
     *
     * @memberof ViewModelCollection
     *
     * @param {String} idToFind - The ID (or UID) of the ViewModelObject to find.
     * @return {Number} Index in the ViewModelSelection of the ViewModelObject found (or -1 if not found).
     */
    self.findViewModelObjectById = function( idToFind ) {
        for( var ndx = 0; ndx < self.loadedVMObjects.length; ndx++ ) {
            var vmo = self.loadedVMObjects[ ndx ];

            if( vmo.alternateID && vmo.alternateID === idToFind ) {
                return ndx;
            }

            if( vmo.id && vmo.id === idToFind ) {
                return ndx;
            }

            if( vmo.uid && vmo.uid === idToFind ) {
                return ndx;
            }
        }

        return -1;
    };

    /**
     * Remove the passed in objects (array of viewModelTreeNodes)
     *
     * @param {Array} objectsToRemove an array of viewModelTreeNodes keyed by uid
     */
    self.removeLoadedObjects = function( objectsToRemove ) {
        if( objectsToRemove && objectsToRemove.length > 0 ) {
            _.remove( self.loadedVMObjects, function( treeNode ) {
                var i = 0;
                var doRemove = false;

                while( i < objectsToRemove.length && !doRemove ) {
                    if( treeNode.uid === objectsToRemove[ i ].uid ) {
                        doRemove = true;
                    }
                    i++;
                }
                return doRemove;
            } );
        }
    };

    /**
     * Free up all resources held/managed by this object.
     * <P>
     * Note: After this function, no API call should be considered valid. This function is intended to be
     * called when the $scope of any associated viewModel is also being 'destroyed'. After this call (and a
     * GC event), any objects managed by this class may be considered a 'memory leak'.
     */
    self.destroy = function() {
        self._isDestroyed = true;

        _debug_currentCount.viewModelCollection--;

        if( _debug_logMiscModelLifeCycle ) {
            logger.info( 'Destroying ViewModelCollection: ' + self._modelId + ' # Remaining:' +
                _debug_currentCount.viewModelCollection );
        }

        _.forEach( _eventBusSubDefs, function( subDef ) {
            eventBus.unsubscribe( subDef );
        } );

        _eventBusSubDefs = null;

        self.clear();
    };

    /**
     * ---------------------------------------------------------------------------<BR>
     * Property & Function definition complete....Finish initialization. <BR>
     * ---------------------------------------------------------------------------<BR>
     */

    self._modelId = _debug_nextId.viewModelCollection++;

    _debug_currentCount.viewModelCollection++;

    if( _debug_logMiscModelLifeCycle ) {
        logger.info( 'Created ViewModelCollection: ' + self._modelId );
    }

    _eventBusSubDefs.push( eventBus.subscribe( 'cdm.new', function( event ) {
        _eventDataNew.newObjects = event.newObjects;

        eventBus.publish( _eventTopicNew, _eventDataNew );
    } ) );

    _eventBusSubDefs.push( eventBus.subscribe( 'cdm.modified', function( event ) {
        _eventDataModified.modifiedObjects = event.modifiedObjects;

        eventBus.publish( _eventTopicModified, _eventDataModified );

        /**
         * Post process cdm event to update any of the reported objects that may be loaded in this
         * viewModelCollection.
         */
        viewModelObjectSvc.updateViewModelObjectCollection( self.loadedVMObjects, event.modifiedObjects );
    } ) );

    // Listen for CDM Deleted events (will be unregistered onDestroy)
    _eventBusSubDefs.push( eventBus.subscribe( 'cdm.deleted', function( event ) {
        /**
         * Post process cdm deleted event to remove any deleted objects from viewModelCollection collection
         * of loadedVMObjects and then set the totalObjectsLoaded count.
         */
        if( event.deletedObjectUids && event.deletedObjectUids.length > 0 ) {
            _.forEach( event.deletedObjectUids, function( deletedUid ) {
                // remove the found object by uid from the collection of loadedVMObjects
                _.remove( self.loadedVMObjects, function( vmo ) {
                    return vmo.uid === deletedUid;
                } );
            } );

            self.totalObjectsLoaded = self.loadedVMObjects.length;
        }
    } ) );
};

_debug_logMiscModelLifeCycle = browserUtils.getUrlAttributes().logMiscModelLifeCycle === '';

var exports = {};

/**
 * Create new instance of view model collection
 *
 * @param {String} name - name of the ViewModelCollection
 * @return {ViewModelCollection} Returns view model collection object
 */
export let createViewModelCollection = function( name ) {
    return new ViewModelCollection( name );
};

exports = {
    createViewModelCollection
};
export default exports;
/**
 * This factory creates ViewModelCollection instances which maintain the loaded ViewModelObjects and exposes APIs to
 * access the information of collection.
 *
 * @memberof NgServices
 * @member viewModelCollectionFactory
 */
app.factory( 'viewModelCollectionFactory', () => exports );
