// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/Cm1AddToMyChangesService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import pasteSvc from 'js/pasteService';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import cmm from 'soa/kernel/clientMetaModel';
import soaSvc from 'soa/kernel/soaService';
import viewModelObjectService from 'js/viewModelObjectService';
import _eventBus from 'js/eventBus';
import notyService from 'js/NotyModule';
import messagingService from 'js/messagingService';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import _ from 'lodash';

var exports = {};

var relationList = [];
var lastContext = {
    activeChangeDataProvider: null,
    myChangesDataProvider: null
};


/**
 * This function returns the selected Change Object

 * @param {Object} changeGlobalObj -  Selected Change Object from activeChangeDataProvider dataProvider
 * @param {Object} changeSearchObj -  Selected Change Object from myChangesDataProvider dataProvider


 */
export let getSelectedChangeObj = function( changeGlobalObj, changeSearchObj ) {
    let selectedChangeObj = null;
    if( changeGlobalObj && !changeSearchObj ) {
        selectedChangeObj = changeGlobalObj;
    }
    if( !changeGlobalObj && changeSearchObj ) {
        selectedChangeObj = changeSearchObj;
    }
    return selectedChangeObj;
};

/**
 * This function read the isRunAsync values for add to my change
 * @param {Object} data -  data object
 */
export let getProcessingMode = function( data ) {
    let mode = 0;
    if( data.isRunAsync.dbValue === true ) {
        mode = 1;
    }
    return mode;
};


/**
 * This function gets the input required for generate
 * @param {Object} data -  data object
 * @param {Object} changeGlobalObj -  Selected Change Object from activeChangeDataProvider dataProvider
 * @param {Object} changeSearchObj -  Selected Change Object from myChangesDataProvider dataProvider
 * @param {Object} selectedItems - Selected Items to be added in Change Object
 * @param {Object} addRelation - Selected Relation from Drop down List where Items to be added in selected Change Object
 */

export let getInputDataForGenerateStructureEdit = function( data, selectedItems, addRelation ) {
    //set flag on ViewModel to enable redline only if top-most part is selected.
    //Because Redlining is ACE is derived from ECN where Top part of part of Solution.
    data.enableRedlining = false;
    if( appCtxSvc.ctx.aceActiveContext && appCtxSvc.ctx.aceActiveContext.context.topElement ) {
        var topElementUid = appCtxSvc.ctx.aceActiveContext.context.topElement.props.awb0UnderlyingObject.dbValues[0];
        for( var i = 0; i < selectedItems.length; i++ ) {
            var selectedUid = selectedItems[ i ].uid;
            if( topElementUid === selectedUid ) {
                data.enableRedlining = true;
                break;
            }
        }
    }


    //Call soa if solution item is selected and if any objects are revised
    if( addRelation === 'CMHasSolutionItem' && data.isRevised === true ) {
        var selectedObjUids = [];

            for( var i = 0; i < selectedItems.length; i++ ) {
                if( selectedItems[i].modelType.typeHierarchyArray.indexOf( 'Awb0DesignElement' ) > -1 ) {
                    selectedObjUids.push( {
                        uid:selectedItems[i].props.awb0UnderlyingObject.dbValues[0],
                         type:'ItemRevision' } );
                } else {
                    selectedObjUids.push( {
                        uid :selectedItems[i].uid,
                        type:'ItemRevision'
                     } );
                }
            }

        //Prepare input for SOA
        var solutionAndImpactedItems = [];
        for( var i = 0; i < selectedObjUids.length; i++ ) {
            solutionAndImpactedItems.push( {
                solutionObject : selectedObjUids[i],
                impactedObject : { uid:'AAAAAAAAAAAAAA', type:'unknowType' }
            } );
        }


        return solutionAndImpactedItems;
    }
};

/**
 * This function return value selected from Drop down list and set it to Lable
 * @param {Object} assignValue - Selected relation from Drop down List
 * @param {Object} updatePlace -  Lable Name to updated
 * @param {Object} property -  Lable Property
 * @param {Object} data -  data object
 */
export let updateRelationLabel = function( assignValue, updatePlace, property, data ) {
    data.isRevised = false;
    updatePlace[ property ] = assignValue;

    //This is required in case to set the selected objects and selected change object in data
    var changeGlobalObj = data.dataProviders.activeChangeDataProvider.selectedObjects[0];
    var changeSearchObj = data.dataProviders.myChangesDataProvider.selectedObjects[0];
    data.selectedChange = exports.getSelectedChangeObj( changeGlobalObj, changeSearchObj );
    data.selectedItems = appCtxSvc.ctx.mselected;

    if( data.relationList.dbValue === 'CMHasSolutionItem' ) {
        exports.setIsRevised( data );
    }
    return updatePlace;
};

/**
 * This function set Drop Down List values depending on Selected Change Object and its relation to be set in Add to My Changes panel
 * @param {Object} relation - dataProviders activeChangeDataProvider and myChangesDataProvider
 * @param {Object} data -  data object
 */

export let setDisplayValues = function( relation, data ) {
    var preferencesValues = cmm.getType( relation );
    var changeObjRelations = {};
    changeObjRelations.propDisplayValue = preferencesValues.displayName;
    changeObjRelations.dispValue = preferencesValues.displayName;
    changeObjRelations.propInternalValue = relation;
    relationList.push( changeObjRelations );
    data.relationListValues.dbValues = relationList;
    data.relationListValues.dbValue = relationList;
};

/**
 * This function read the Preference values for selected Change Object
 * @param {Object} dataProviders - dataProviders activeChangeDataProvider and myChangesDataProvider
 * @param {Object} data -  data object
 * @param {Object} ctx -  context object
 */

export let updateRelationList = function( dataProvider, data, ctx ) {
    relationList = [];
    var preferenceNames = [];
    var preferencesData;
    var preferencesValues = [];
    for( var type = 0; type < dataProvider.selectedObjects[ 0 ].modelType.typeHierarchyArray.indexOf( 'ChangeItemRevision' ); type++ ) {
        preferenceNames[ type ] = 'CM_' + dataProvider.selectedObjects[ 0 ].modelType.typeHierarchyArray[ type ] + '_AddToMyChange_Relations';
    }
    soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: preferenceNames,
        includePreferenceDescriptions: true
    } ).then( function( response ) {
        if( response ) {
            var schedulePreference = 0;
            preferencesData = response;
            preferencesValues = preferencesData.response[ 0 ].values.values;

            var relationNames = [];
            var relationCMHasWorkBreakdown = [];

            for( var prefValue = 0; prefValue < preferencesValues.length; prefValue++ ) {
                schedulePreference = preferencesData.response[ 0 ].values.values.indexOf( 'CMHasWorkBreakdown' );
                if( prefValue === schedulePreference ) {
                    relationCMHasWorkBreakdown.push( preferencesValues[ prefValue ] );
                    continue;
                }
                relationNames.push( preferencesValues[ prefValue ] );
            }
            var relations = [];

            if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'Schedule' ) > -1 ) {
                relations = relationCMHasWorkBreakdown;
            }else {
                relations =  relationNames;
            }
            var promise = soaSvc.ensureModelTypesLoaded( relations );
            if( promise ) {
                promise.then( function() {
                    for( var prefValue = 0; prefValue < relations.length; prefValue++ ) {
                        exports.setDisplayValues( relations[ prefValue ], data );
                    }
                    if( data.relationList.dbValue === 'CMHasSolutionItem' ) {
                        data.isRevised = true;
                    }
                } );
            }
         }
    } );
};

/**
 * This function handles selection from any of the activeChangeDataProvider dataProvider on Add to My Changes panel
 * @param {Object} dataProviders - dataProviders
 * @param {Object} dataProviderId -  data provide ID
 * @param {Object} context - selected objects on activeChangeDataProvider dataProvider on Add to My Changes panel
 * @param {Object} data -  data object
 * @param {Object} ctx -  context object
 */
export let selectGlobalChangeObject = function( dataProviders, dataProviderId, context, data, ctx ) {
    if( context._refire ) { return; }
    var dataProviderSet = Object.keys( lastContext );
    lastContext[ dataProviderId ] = context;
    var otherDataProviders = _.pull( dataProviderSet, dataProviderId );
    if( data.dataProviders.activeChangeDataProvider.selectedObjects.length > 0 ) {
        exports.updateRelationList( data.dataProviders.activeChangeDataProvider, data, ctx );
    }
    // Clear the selections on other two sections
    if( context.length > 0 ) {
        for( var i = 0; i < otherDataProviders.length; i++ ) {
            if( dataProviders[ otherDataProviders[ i ] ] !== undefined ) {
                var dp = dataProviders[ otherDataProviders[ i ] ];
                if( dp.selectedObjects.length > 0 ) {
                    dp.selectionModel.setSelection( [] );
                }
            }
        }
    }
};

/**
 * This function handles selection from any of the myChangesDataProvider dataProvider on Add to My Changes panel
 * @param {Object} dataProviders - dataProviders
 * @param {Object} dataProviderId -  data provide ID names
 * @param {Object} context - selected objects on myChangesDataProvider dataProvider on Add to My Changes panel
 * @param {Object} data -  data object
 * @param {Object} ctx -  context object
 */
export let selectSearchChangeObject = function( dataProviders, dataProviderId, context, data, ctx ) {
    if( context._refire ) { return; }
    var dataProviderSet = Object.keys( lastContext );
    lastContext[ dataProviderId ] = context;
    var otherDataProviders = _.pull( dataProviderSet, dataProviderId );
    if( data.dataProviders.myChangesDataProvider.selectedObjects.length > 0 ) {
        exports.updateRelationList( data.dataProviders.myChangesDataProvider, data, ctx );
    }
    // Clear the selections on other two sections
    if( context.length > 0 ) {
        for( var i = 0; i < otherDataProviders.length; i++ ) {
            if( dataProviders[ otherDataProviders[ i ] ] !== undefined ) {
                var dp = dataProviders[ otherDataProviders[ i ] ];
                if( dp.selectedObjects.length > 0 ) {
                    dp.selectionModel.setSelection( [] );
                }
            }
        }
    }else{
        //set isRevised to false to remove run as Background box
        data.isRevised = false;
    }
};

/**
 * This function returns the Change context Object (active change object) to set in activeChangeDataProvider which sets in Add to My Changes panel
 * @param {Object} uid - uid of Change Context Object
 * @param {Object} dataProvider -  activeChangeDataProvider dataProvider

 */
export let activeChangeObject = function( uid, dataProvider ) {
    var deferred = AwPromiseService.instance.defer();
    var typeUids = [];
    var modelObject = null;

    if( !uid ) {
        return;
    }
    typeUids.push( uid );
    dmSvc.loadObjects( typeUids ).then( function() {
        modelObject = cdm.getObject( uid, dataProvider );
        if( modelObject && !_.isEmpty( modelObject.props ) ) {
            var vmModel = viewModelObjectService.constructViewModelObjectFromModelObject( modelObject );
            dataProvider.viewModelCollection.loadedVMObjects.push( vmModel );
            var outputData = {
                setGlobalChange: vmModel
            };
            deferred.resolve( outputData );
        }
    } );
    return deferred.promise;
};

/**
 * This function returns the Change Object List which are supported by type Schedule
 */
export let getChangeTypeToDisplay = function() {
    if( appCtxSvc.ctx.selected.modelType.typeHierarchyArray.indexOf( 'Schedule' ) > -1 ) {
        var changeTypes = 'GnChangeNoticeRevision,GnChangeRequestRevision';
        return changeTypes;
    }
        return '';
};

/**
 * Set the isRevised to true if selected Item revision is other than 'A'
 *
 * @param {Object} data The panel's view model object
 */
export let setIsRevised = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var selectedItem;
    var selectedItems = [];
    if( appCtxSvc.ctx.mselected ) {
        for( var i = 0; i < appCtxSvc.ctx.mselected.length; i++ ) {
            if( appCtxSvc.ctx.mselected[i].modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
                selectedItems.push( appCtxSvc.ctx.mselected[i].props.awb0UnderlyingObject.dbValues[0] );
            } else {
                selectedItems.push( appCtxSvc.ctx.mselected[i].uid );
            }
        }
    }

    dmSvc.getProperties( selectedItems, [ 'revision_list' ] ).then( function() {
        for( var index = 0; index < selectedItems.length; index++ ) {
            selectedItem = cdm.getObject( selectedItems[index] );
            if( selectedItem.props.revision_list.dbValues.length > 1 ) {
                if( selectedItem.props.revision_list.dbValues[0] !== appCtxSvc.ctx.selected.uid ) {
                    data.isRevised = true;
                    break;
                }
            } else {
                data.isRevised = false;
            }
        }
        if( data.isRevised === true ) {
            data.selectedItems = selectedItems;
        }
        deferred.resolve( selectedItems
             );
      } );
    return deferred.promise;
};


//Get the list of items and its associated ECNS
export let getListOfItemAndECNs = function( response, data ) {
    //Prepare a map of selected item to its corresponding ECNs
    var selectedItemsAndChangeNoticeList = [];
    if( response.output.length > 0 ) {
        for( var i in response.output ) {
           var selectedItem = response.output[i].inputObject;
           var changeObject =  null;
           if( response.output[i].relationshipData[0].relationshipObjects.length > 0 ) {
                changeObject = response.output[i].relationshipData[0].relationshipObjects[0].otherSideObject;
           }
           selectedItemsAndChangeNoticeList.push( {
              item         : selectedItem,
              changeNotice : changeObject
           } );
        }
    }
    //Need to notify user if selected item is already part of some other change
    exports.populateMessageIfSelectedItemAlreadyPartofOtherECN( selectedItemsAndChangeNoticeList, data );
};

export let populateMessageIfSelectedItemAlreadyPartofOtherECN = function( selectedItemsAndChangeNoticeList, data ) {
    var allItems = [];
    var itemsCannotBeProcessed = [];
    var itemsCanBeProcessed = [];
    var finalMessage;
    var popUpMessage = '';
    var changeGlobal = data.dataProviders.activeChangeDataProvider.selectedObjects[0];
    var changeSearch = data.dataProviders.myChangesDataProvider.selectedObjects[0];
    var selectedChangeObject = exports.getSelectedChangeObj( changeGlobal, changeSearch );
    //Run through all selected items and check if the change object that it is already part of is same as that of the selected change
    for( var index = 0; index < selectedItemsAndChangeNoticeList.length; index++ ) {
        var selectedItem = selectedItemsAndChangeNoticeList[index].item;
        var changeNotice = selectedItemsAndChangeNoticeList[index].changeNotice;
        allItems.push( selectedItem );
        if( changeNotice !== null ) {
            if( changeNotice.uid !== selectedChangeObject.uid ) {
                itemsCannotBeProcessed.push( selectedItem );
                var selectedObjectName = TypeDisplayNameService.instance.getDisplayName( selectedItem );
                var selectedChangeObjectName = TypeDisplayNameService.instance.getDisplayName( selectedChangeObject );
                var associatedChangeObject = TypeDisplayNameService.instance.getDisplayName( changeNotice );
                popUpMessage = popUpMessage.concat( messagingService.applyMessageParams( data.i18n.alreadyAssociatedToChange, [ '{{selectedObjectName}}', '{{selectedChangeObjectName}}', '{{associatedChangeObject}}' ],
                                        { selectedObjectName: selectedObjectName,
                                          selectedChangeObjectName: selectedChangeObjectName,
                                          associatedChangeObject:associatedChangeObject
                                        } ) ).concat( '</br>' );
            } else {
                itemsCanBeProcessed.push( selectedItem );
            }
        } else {
            itemsCanBeProcessed.push( selectedItem );
        }
    }
    var message = messagingService.applyMessageParams( data.i18n.numberOfSelectionsAddedToChange, [ '{{canBeProcessed}}', '{{totalSelectedObj}}' ], {
        canBeProcessed: itemsCanBeProcessed.length,
        totalSelectedObj: allItems.length
    } );
    var message;
    //If there are no items that can be added to change and the selected item is just one item,
    //then just show an error that it is already associated with other change
    if( itemsCanBeProcessed.length === 0 && allItems.length === 1 ) {
        messagingService.showError( popUpMessage );
        _eventBus.publish( 'cdm.relatedModified', {
            refreshLocationFlag: true,
            relatedModified: [ allItems ]
        } );
    }
    //If there are no items that can be added to change and selected items are greater than 1,
    //then just throw an error that none of the selections can be added to change as they are already associated as
    //solutions to other change
    else if( itemsCanBeProcessed.length === 0 && allItems.length > 1 ) {
        messagingService.showError( data.i18n.noSelectionsCanBeAddedToChange.replace( '{0}', allItems.length ) );

        _eventBus.publish( 'cdm.relatedModified', {
            refreshLocationFlag: true,
            relatedModified: [ allItems ]
        } );
    }

    //If there are some selected items which are part of the change, other than the selected one,
    //then notification message needs to be shown
    else if( itemsCannotBeProcessed.length > 0 ) {
        message = messagingService.applyMessageParams( data.i18n.numberOfSelectionsAddedToChange, [ '{{canBeProcessed}}', '{{totalSelectedObj}}' ], {
            canBeProcessed: itemsCanBeProcessed.length,
            totalSelectedObj: allItems.length
        } );
        finalMessage = message.concat( '</br>' ).concat( popUpMessage );
        var buttons = [ {
            addClass: 'btn btn-notify',
            text: data.i18n.cancelText,
            onClick: function( $noty ) {
                $noty.close();
                _eventBus.publish( 'cdm.relatedModified', {
                    refreshLocationFlag: true,
                    relatedModified: [ allItems ]
                } );
            }
        },
        {
            //Call soa if clicked on proceed
            addClass: 'btn btn-notify',
            text: data.i18n.proceedText,
            onClick: function( $noty ) {
                $noty.close();
                data.selectedItems = itemsCanBeProcessed;
                _eventBus.publish( 'addToMyChanges.generateStructureEdit' );
            }
        }
        ];
        notyService.showWarning( finalMessage, buttons );
    } else {
        //If none of the items are associated with any other change, then just proceed by calling SOA
        data.selectedItems = allItems;
        _eventBus.publish( 'addToMyChanges.generateStructureEdit' );
    }
};

//Get the selected items as input for finding the other side objects
export let prepareExpandGRMRelationInput = function() {
    var selectedItems = [];
    if( appCtxSvc.ctx.mselected ) {
        for( var i = 0; i < appCtxSvc.ctx.mselected.length; i++ ) {
            if( appCtxSvc.ctx.mselected[i].modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
                selectedItems.push( appCtxSvc.ctx.mselected[i].props.awb0UnderlyingObject.dbValues[0] );
            } else {
                selectedItems.push( appCtxSvc.ctx.mselected[i].uid );
            }
        }
    }
    var input = [];
    _.forEach( selectedItems, function( selectedItem ) {
        var item = {
            uid : selectedItem,
            type: 'ItemRevision'
        };
        input.push( item );
    } );
    return input;
};

export default exports = {

    updateRelationLabel,

    setDisplayValues,
    updateRelationList,
    selectGlobalChangeObject,
    selectSearchChangeObject,
    activeChangeObject,
    getChangeTypeToDisplay,
    setIsRevised,
    getSelectedChangeObj,
    getProcessingMode,
    getInputDataForGenerateStructureEdit,
    getListOfItemAndECNs,
    populateMessageIfSelectedItemAlreadyPartofOtherECN,
    prepareExpandGRMRelationInput
};
/**
 * Return an Object of Cm1AddToMyChangesService
 * @memberof NgServices
 * @member Cm1AddToMyChangesService
 */
app.factory( 'Cm1AddToMyChangesService', () => exports );
