// Copyright (c) 2020 Siemens

/**
 * dataSourceService factory
 *
 * @module js/dataSourceService
 */
import app from 'app';
import uwPropertyService from 'js/uwPropertyService';
import policySvc from 'soa/kernel/propertyPolicyService';
import viewModelObjectService from 'js/viewModelObjectService';
import _ from 'lodash';
import logger from 'js/logger';

var DataSourceService = function( dataSource ) {
    var _self = this; // eslint-disable-line consistent-this

    var _dataProvider = null;
    var _declViewModel = null;

    var _setdataSourceService = function( dataSource ) {
        if( dataSource.declViewModel ) {
            _declViewModel = dataSource.declViewModel;
        } else if( dataSource.dataProvider ) {
            _dataProvider = dataSource.dataProvider;
        }
    };

    _self.getDataProvider = function() {
        return _dataProvider;
    };

    _self.getDeclViewModel = function() {
        return _declViewModel;
    };

    _self.getSourceObject = function() {
        if( _dataProvider ) {
            return _dataProvider;
        }
        return _declViewModel;
    };

    _self.getContextVMO = function() {
        if( _declViewModel ) {
            return _declViewModel.baseselection ? _declViewModel.baseselection : _declViewModel.vmo;
        }
        return null;
    };

    _self.hasxrtBasedViewModel = function() {
        var hasxrtBasedVM = false;
        var srcObj = _self.getSourceObject();
        if( srcObj.xrtType === 'INFO' && !_.isEmpty( srcObj.xrtData ) &&
            !_.isEmpty( srcObj.xrtData.xrtViewModel ) ) {
            hasxrtBasedVM = true;
        } else {
            hasxrtBasedVM = srcObj.gwtPresenters && srcObj.gwtPresenters.length > 0;
        }
        return hasxrtBasedVM;
    };

    /**
     * This returns all the HTML Panels ids currently present in the View.
     *
     * @returns {ObjectArray} - Panel IDs
     */
    _self.getGwtHTMLPanelIds = function() {
        var srcObj = _self.getSourceObject();
        if( srcObj.gwtPresenters ) {
            return srcObj.gwtPresenters;
        }
        return [];
    };

    /**
     * This returns all the HTML Panels ids currently present in the View.
     *
     * @returns {ObjectArray} - Panel IDs
     */
    _self.getGwtVMs = function() {
        var srcObj = _self.getSourceObject();
        if( srcObj.gwtVieModel ) {
            return srcObj.gwtVieModel;
        }
        return [];
    };

    /**
     * Get all the loaded view modle objects
     *
     * @return {ObjectArray} Array of loaded view model objects
     */
    _self.getLoadedViewModelObjects = function( allowDuplicates ) {
        var loadedViewModelObjects = [];

        if( _dataProvider && _dataProvider.viewModelCollection ) {
            loadedViewModelObjects = _dataProvider.getEditableObjects();
        } else if( _declViewModel ) {
            if( _declViewModel.vmo ) {
                loadedViewModelObjects.push( _declViewModel.vmo );
            }

            if( _declViewModel.dataProviders ) {
                _.forEach( _declViewModel.dataProviders, function( dataProvider ) {
                    if( dataProvider && dataProvider.viewModelCollection ) {
                        loadedViewModelObjects = loadedViewModelObjects
                            .concat( dataProvider.viewModelCollection.getLoadedViewModelObjects() );
                    }
                } );
            }

            if( _declViewModel.customPanel && _declViewModel.customPanel.viewModelCollection ) {
                loadedViewModelObjects = loadedViewModelObjects
                    .concat( _declViewModel.customPanel.viewModelCollection );
            }
        }

        // Weed out the duplicate ones
        if( !allowDuplicates ) {
            loadedViewModelObjects = _.uniq( loadedViewModelObjects, false, function( vmo ) {
                return vmo.uid;
            } );
        }

        return loadedViewModelObjects;
    };

    /**
     * Get all the collections in the view model.
     *
     * @return {ObjectArray} Array of collections.
     */
    _self.getAllCollectionsAndPropertyNames = function() {
        var collections = [];

        if( _declViewModel.dataProviders ) {
            _.forEach( _declViewModel.dataProviders, function( dataProvider ) {
                if( dataProvider && dataProvider.viewModelCollection ) {
                    var collection = dataProvider.viewModelCollection.getLoadedViewModelObjects();
                    var properties = [];
                    _.forEach( dataProvider.cols, function( col ) {
                        properties.push( col.name );
                    } );

                    var collectionData = {
                        collection: collection,
                        properties: properties
                    };
                    collections = collections.concat( collectionData );
                }
            } );
        }

        if( _declViewModel && _declViewModel.vmo ) {
            collections.push( {
                collection: [ _declViewModel.vmo ],
                properties: []
            } );
        }

        return collections;
    };

    /**
     * Get all the collection keys from the view model
     *
     * @returns {StringArray} - Keys.
     */
    _self.getCollectionKeys = function() {
        var collectionKeys = [];
        if( _declViewModel.dataProviders ) {
            _.forEach( _declViewModel.dataProviders, function( dataProvider ) {
                collectionKeys.push( dataProvider.name );
            } );
        }
        return collectionKeys;
    };

    /**
     * Get all the collections in the view model.
     *
     * @param {Object} dataBindValue - The data bind value.
     *
     * @return {ObjectArray} Array of collections.
     */
    _self.getCollectionAndPropertyNames = function( dataBindValue ) {
        var collData = {};

        if( _declViewModel.dataProviders ) {
            _.forEach( _declViewModel.dataProviders, function( dataProvider ) {
                if( dataProvider && dataProvider.name === dataBindValue && dataProvider.viewModelCollection ) {
                    var collection = dataProvider.viewModelCollection.getLoadedViewModelObjects();
                    var properties = [];
                    _.forEach( dataProvider.cols, function( col ) {
                        properties.push( col.name );
                    } );

                    collData.collection = collection;
                    collData.properties = properties;
                    return;
                }
            } );
        } else if( dataBindValue === '' && _declViewModel ) {
            var properties = [];
            _.forEach( _declViewModel.vmo.props, function( prop ) {
                properties.push( prop.propertyName );
            } );

            collData.properties = properties;
            collData.collection = [ _declViewModel.vmo ];
        }

        return collData;
    };

    _self.setSelectionEnabled = function( isEnabled ) {
        if( _dataProvider && _dataProvider.selectionModel ) {
            _dataProvider.setSelectionEnabled( isEnabled );
        } else if( _declViewModel && _declViewModel.dataProviders ) {
            _.forEach( _declViewModel.dataProviders, function( dataProvider ) {
                if( dataProvider && dataProvider.selectionModel ) {
                    dataProvider.setSelectionEnabled( isEnabled );
                }
            } );
        }
    };

    _self.getPropertyMap = function() {
        var uidtoPropNameMap = {};
        var loadedViewModelObjs = viewModelObjectService.getVmosNotInEdit( _self.getLoadedViewModelObjects() );
        if( _dataProvider && _dataProvider.viewModelCollection ) {
            var propNames = _dataProvider.getPropertyNames();
            _.forEach( loadedViewModelObjs, function( vmObjects ) {
                uidtoPropNameMap[ vmObjects.uid ] = propNames;
            } );
        } else if( _declViewModel ) {
            var customPanelUids = [];
            // For custom panels, include underlying objects in uidtoPropNameMap
            if( _declViewModel.customPanel && _declViewModel.customPanel.viewModelCollection ) {
                _declViewModel.customPanel.viewModelCollection.map( function( obj ) {
                    if( obj && obj.props ) {
                        customPanelUids.push( obj.uid );
                        _.forEach( obj.props, function( prop ) {
                            if( prop.parentUid !== obj.uid ) {
                                customPanelUids.push( prop.parentUid );
                            }
                        } );
                    }
                } );
            }

            _.forEach( loadedViewModelObjs, function( vmObjects ) {
                fetchPropNamesFromVMO( vmObjects, uidtoPropNameMap, customPanelUids );
            } );
        }

        return uidtoPropNameMap;
    };

    /**
     * This function generates the uid to propertyName map
     *
     * @param {ViewModelObject} vmo - Object to access.
     *
     * @param {StringToStringMap} uidtoPropNameMap - ID Map.
     *
     * @param {Array} customPanelUids - array of custom panel uids (also includes parentUid of
     *   properties if they are different)
     */
    function fetchPropNamesFromVMO( vmo, uidtoPropNameMap, customPanelUids ) {
        _.forEach( vmo.props, function( props ) {
            var uid = props.parentUid ? props.parentUid : vmo.uid;
            var propNames = uidtoPropNameMap[ uid ] ? uidtoPropNameMap[ uid ] : [];
            if( props && props.type ) {
                propNames.push( props.propertyName );
            }
            if( uid === vmo.uid || _.includes( customPanelUids, uid ) ) {
                uidtoPropNameMap[ uid ] = propNames;
            }
        } );
    }

    _self.checkEditableOnProperties = function() {
        var loadedVMObjects = _self.getLoadedViewModelObjects();
        _.forEach( loadedVMObjects, function( vmo ) {
            vmo.setEditableStates( true, true, true );
        } );

        uwPropertyService.triggerDigestCycle();
    };

    _self.updatePartialEditState = function( failureUids, modifiedPropsMap ) {
        const loadedVMObjects = viewModelObjectService.getLoadedAndCachedViewModelObjects( _self.getLoadedViewModelObjects() );
        _.forEach( loadedVMObjects, function( vmo ) {
            if( !_.includes( failureUids, vmo.uid ) ) {
                vmo.setEditableStates( false, true, true );
                if( modifiedPropsMap[ vmo.uid ] ) {
                    var propsToReset = modifiedPropsMap[ vmo.uid ].viewModelProps;
                    _.forEach( propsToReset, function( prop ) {
                        uwPropertyService.resetProperty( prop );
                    } );
                }
            }
        } );

        uwPropertyService.triggerDigestCycle();
    };

    _self.getAllEditableProperties = function() {
        var allEditableProperties = [];
        var loadedVMObjects = _self.getLoadedViewModelObjects();
        _.forEach( loadedVMObjects, function( vmo ) {
            _.forEach( vmo.props, function( prop ) {
                if( prop && prop.isEditable ) {
                    allEditableProperties.push( prop );
                }
            } );
        } );
        return allEditableProperties;
    };

    _self.getAllModifiedProperties = function() {
        const allModifiedProperties = [];
        const loadedVMObjects = viewModelObjectService.getLoadedAndCachedViewModelObjects( _self.getLoadedViewModelObjects() );
        _.forEach( loadedVMObjects, function( vmo ) {
            _.forEach( vmo.props, function( prop ) {
                if( uwPropertyService.isModified( prop ) ) {
                    allModifiedProperties.push( prop );
                }
            } );
        } );

        return allModifiedProperties;
    };

    _self.getAllAutoAssignableProperties = function() {
        var allAutoAssignableProperties = [];
        var loadedVMObjects = _self.getLoadedViewModelObjects();
        _.forEach( loadedVMObjects, function( vmo ) {
            _.forEach( vmo.props, function( prop ) {
                if( vmo.isAutoAssignable ) {
                    allAutoAssignableProperties.push( prop );
                }
            } );
        } );

        return allAutoAssignableProperties;
    };

    _self.resetUpdates = function() {
        var modifiedProps = _self.getAllModifiedProperties();
        _.forEach( modifiedProps, function( prop ) {
            uwPropertyService.resetUpdates( prop, false );
        } );
    };

    _self.replaceValuesWithNewValues = function() {
        var loadedVMObjects = _self.getLoadedViewModelObjects();
        _.forEach( loadedVMObjects, function( vmo ) {
            _.forEach( vmo.props, function( prop ) {
                uwPropertyService.replaceValuesWithNewValues( prop );
            } );
        } );
    };

    _self.replaceValuesWithNewValues = function( propArr ) {
        _.forEach( propArr, function( prop ) {
            uwPropertyService.replaceValuesWithNewValues( prop );
        } );
    };

    _self.getAllModifiedPropertiesWithVMO = function() {
        var allModifiedProperties = [];
        var loadedVMObjects = _self.getLoadedViewModelObjects();
        _.forEach( loadedVMObjects, function( vmo ) {
            var modifiedPropArray = [];
            _.forEach( vmo.props, function( prop ) {
                if( uwPropertyService.isModified( prop ) ) {
                    modifiedPropArray.push( prop );
                }
            } );
            if( modifiedPropArray.length > 0 ) {
                allModifiedProperties.push( {
                    viewModelProps: modifiedPropArray,
                    viewModelObject: vmo
                } );
            }
        } );

        return allModifiedProperties;
    };

    /**
     * Returns an object of this structure: { 'uid': { 'viewModelObject': ViewModelObject, 'viewModelProps': [
     * ViewModelProperty1, ViewModelProperty2, ... ] } }
     *
     * @param {ObjectArray} modifiedViewModelProperties - Array of modified View Model Properties
     * @return {Object} Map
     */
    _self.getModifiedPropertiesMap = function( modifiedViewModelProperties ) {
        const loadedViewModelObjs = viewModelObjectService.getLoadedAndCachedViewModelObjects( _self.getLoadedViewModelObjects() );
        var modifiedValuesMap = {};
        if( modifiedViewModelProperties && modifiedViewModelProperties.length > 0 ) {
            _.forEach( modifiedViewModelProperties, function( modifiedProp ) {
                var parentUid = modifiedProp.parentUid;
                if( parentUid ) {
                    var vmo = getVMOFromUid( parentUid, loadedViewModelObjs );
                    if( !vmo ) {
                        vmo = viewModelObjectService.createViewModelObject( parentUid, 'EDIT' );
                    }
                    var vmoToPropMap = _.get( modifiedValuesMap, [ parentUid ] );
                    if( vmoToPropMap ) {
                        if( vmoToPropMap.viewModelProps ) {
                            vmoToPropMap.viewModelProps.push( modifiedProp );
                        }
                    } else {
                        var newVmoToPropMap = {};
                        newVmoToPropMap.viewModelObject = vmo;
                        newVmoToPropMap.viewModelProps = [ modifiedProp ];
                        _.set( modifiedValuesMap, [ parentUid ], newVmoToPropMap );
                    }
                } else {
                    logger.info( 'Info: no parentUid found on ViewModelProperty: ' + modifiedProp.getId() );
                }
            } );
        }
        return modifiedValuesMap;
    };

    /**
     * @param {String} targetUID - UID
     * @param {ViewModelObjectArray} loadedViewModelObjs - Loaded VMOs.
     *
     * @return {ViewModelObject} VMO Associated with given input.
     */
    function getVMOFromUid( targetUID, loadedViewModelObjs ) {
        var targetVMO = null;
        if( loadedViewModelObjs && loadedViewModelObjs.length > 0 ) {
            _.forEach( loadedViewModelObjs, function( vmo ) {
                var uid = vmo.uid;
                if( uid === targetUID ) {
                    targetVMO = vmo;
                    return false;
                }
            } );
        }
        return targetVMO;
    }

    /**
     * Reset all 'editable' status properties from the underlying object.
     */
    _self.saveEditiableStates = function() {
        var loadedVMObjects = _self.getLoadedViewModelObjects();
        _.forEach( loadedVMObjects, function( vmo ) {
            vmo.setEditableStates( false, true, true );
        } );

        var modifiedPropsArr = _self.getAllModifiedProperties();

        _.forEach( modifiedPropsArr, function( prop ) {
            uwPropertyService.resetProperty( prop );
        } );

        uwPropertyService.triggerDigestCycle();
    };

    _self.resetEditiableStates = function() {
        var loadedVMObjects = viewModelObjectService.getLoadedAndCachedViewModelObjects( _self.getLoadedViewModelObjects() );
        _.forEach( loadedVMObjects, function( vmo ) {
            vmo.clearEditiableStates( true );
        } );

        uwPropertyService.triggerDigestCycle();
    };

    _self.registerPropPolicy = function() {
        var dataProvider = _self.getDataProvider();
        var declViewModelObj = _self.getDeclViewModel();
        var policy = null;
        if( dataProvider && !_.isUndefined( dataProvider.policy ) ) {
            policy = _.clone( dataProvider.policy, true );
            updatePropPolicyForEditing( policy, 'true', dataProvider );
            dataProvider.editPolicyId = policySvc.register( policy );
        } else if( declViewModelObj ) {
            policy = {
                types: []
            };

            if( !_.isUndefined( declViewModelObj.propertyPolicyRetrieved ) ) {
                var policyType = {
                    properties: []
                };
                policyType.name = declViewModelObj.vmo.type;
                policyType.properties = _.clone( declViewModelObj.propertyPolicyRetrieved );
                policy.types.push( policyType );
            }
            if( declViewModelObj._policy && declViewModelObj._policy.types ) {
                _.forEach( declViewModelObj._policy.types, function( policyType ) {
                    policy.types = policy.types.concat( _.clone( policyType ) );
                } );
            }

            var viewModelObjs = _self.getLoadedViewModelObjects();
            _.forEach( viewModelObjs, function( viewModelObj ) {
                _.forEach( viewModelObj.props, function( prop ) {
                    var modelObj = uwPropertyService.getSourceModelObject( prop );
                    if( modelObj ) {
                        var typeName = modelObj.type;
                        var policyType = policy.types.filter( function( polType ) {
                            if( polType && polType.name === typeName ) {
                                return true;
                            }
                        } )[ 0 ];

                        if( !policyType ) {
                            policyType = {
                                properties: []
                            };
                            policy.types.push( policyType );
                        }

                        policyType.name = typeName;
                        var propName = uwPropertyService.getBasePropertyName( prop.propertyName );

                        var propRegistered = policyType.properties.filter( function( prop ) {
                            return prop && prop.name === propName;
                        } )[ 0 ];

                        if( !propRegistered ) {
                            policyType.properties.push( {
                                name: propName
                            } );
                        }
                    }
                } );
            } );
            updatePropPolicyForEditing( policy, 'true', declViewModelObj );
            declViewModelObj.editPolicyId = policySvc.register( policy );
        }
    };

    _self.unregisterPropPolicy = function() {
        var dataProvider = _self.getDataProvider();
        if( dataProvider && dataProvider.editPolicyId ) {
            policySvc.unregister( dataProvider.editPolicyId );
            delete dataProvider.editPolicyId;
        }

        var declViewModelObj = _self.getDeclViewModel();
        if( declViewModelObj && declViewModelObj.editPolicyId ) {
            policySvc.unregister( declViewModelObj.editPolicyId );
            delete declViewModelObj.editPolicyId;
        }
    };

    /**
     * Can we start editing?
     *
     * @return {Boolean} true if we can start editing
     */
    _self.canStartEdit = function() {
        var canStartEdit = false;
        var viewModelObjectList;
        var declVM = _self.getDeclViewModel();
        if( declVM && declVM.vmo ) {
            viewModelObjectList = [ declVM.vmo ];
        } else if( _self.getDataProvider() ) {
            viewModelObjectList = _self.getLoadedViewModelObjects( true );
        }

        if( viewModelObjectList ) {
            for( var ndx = 0, len = viewModelObjectList.length; ndx < len; ndx++ ) {
                // check 'is_modifiable' flag for modelObject
                if( isModifiable( viewModelObjectList[ ndx ] ) ) {
                    canStartEdit = true;
                    break;
                }
            }
        }
        return canStartEdit;
    };

    /**
     * Check to see if the view model object is editable
     *
     * @param {ViewModelObject} viewModelObject - VMO to test.
     *
     * @return {Boolean} true if it's editable
     */
    function isModifiable( viewModelObject ) {
        return viewModelObject && viewModelObject.props && //
            viewModelObject.props.is_modifiable && //
            viewModelObject.props.is_modifiable.dbValues && //
            viewModelObject.props.is_modifiable.dbValue === true;
    }

    /**
     * Update the policy for editing
     *
     * @param {Object} policy - the policy to be updated for editing
     * @param {String} newValue - the newValue
     * @param {Object} dataProvider - the dataProvider
     */
    function updatePropPolicyForEditing( policy, newValue, dataProvider ) {
        if( dataProvider && policy.types ) {
            _.forEach( policy.types, function( policyType ) {
                if( dataProvider.cols ) {
                    _.forEach( dataProvider.cols, function( col ) {
                        if( col && col.typeName && col.typeName === policyType.name ) {
                            var modifier = locateOrCreateModifier( policyType, 'includeIsModifiable' );
                            modifier.Value = newValue;
                        }
                    } );
                } else {
                    var modifier = locateOrCreateModifier( policyType, 'includeIsModifiable' );
                    modifier.Value = newValue;
                }
            } );
        }
    }

    /**
     * Locate or create the property modifier
     *
     * @param {Object} policyType - the policy
     * @param {String} name - the modifier to be created or found
     *
     * @returns {Object} Property modifier.
     */
    function locateOrCreateModifier( policyType, name ) {
        var modifier = null;

        if( policyType.modifiers ) {
            for( var ii = 0; ii < policyType.modifiers.length; ii++ ) {
                modifier = policyType.modifiers[ ii ];
                if( name === modifier.name ) {
                    return modifier;
                }
            }
        } else {
            policyType.modifiers = [];
        }

        modifier = {
            name: name
        };

        policyType.modifiers.push( modifier );

        return modifier;
    }

    _setdataSourceService( dataSource );
};

let exports;

export let createNewDataSource = function( dataSource ) {
    return new DataSourceService( dataSource );
};

exports = {
    createNewDataSource
};
export default exports;
/**
 * This factory creates 'UwDataProvider' objects used for lists, grids and other collections).
 *
 * @memberof NgServices
 * @member dataProviderFactory
 *
 * @param {uwPropertyService} uwPropertyService - Service to use.
 * @param {soa_kernel_propertyPolicyService} policySvc - Service to use.
 * @param {viewModelObjectService} viewModelObjectService - Service to use.
 *
 * @returns {dataSourceService} Reference to service API object.
 */
app.factory( 'dataSourceService', () => exports );
