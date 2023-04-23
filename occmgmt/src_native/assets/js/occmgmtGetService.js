// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/occmgmtGetService
 */
import app from 'app';
import AwFilterService from 'js/awFilterService';
import soaSvc from 'soa/kernel/soaService';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import aceFilterService from 'js/aceFilterService';
import AwPromiseService from 'js/awPromiseService';
import occmgmtGetOccsResponseService from 'js/occmgmtGetOccsResponseService';
import occmgmtRequestPrefPopulatorService from 'js/occmgmtRequestPrefPopulatorService';
import dateTimeService from 'js/dateTimeService';
import _ from 'lodash';
import occmgmtUtils from 'js/occmgmtUtils';

var _convertDate = function( dateInEpochFormat ) {
    if( !dateInEpochFormat || dateInEpochFormat < 0 ) {
        return dateTimeService.NULLDATE;
    }
    return AwFilterService.instance( 'date' )( dateInEpochFormat, 'yyyy-MM-dd' ) + 'T' +
        AwFilterService.instance( 'date' )( dateInEpochFormat, 'HH:mm:ssZ' );
};

var _populateFocusOccurrenceInputParameters = function( inputData, currentContext ) {
    /**
     * Check if the 'focus' has not been set yet.
     */
    if( _.isEmpty( inputData.focusOccurrenceInput ) ) {
        if( currentContext.currentState.c_csid ) {
            inputData.focusOccurrenceInput.cloneStableIdChain = currentContext.currentState.c_csid;
        } else {
            if( //
                clientDataModelSvc.isValidObjectUid( currentContext.currentState.c_uid ) && //
                clientDataModelSvc.isValidObjectUid( currentContext.currentState.o_uid ) && //
                clientDataModelSvc.isValidObjectUid( inputData.parentElement ) && //
                currentContext.currentState.c_uid !== currentContext.currentState.o_uid && //
                currentContext.currentState.c_uid !== currentContext.currentState.t_uid ) {
                /**
                 * Note: We only want to set a 'focus' when we have all the correct 'parent' information.
                 */
                inputData.focusOccurrenceInput.element = occmgmtUtils.getObject( currentContext.currentState.c_uid );
            }
        }
    }
};

var _populateCursorParameters = function( cursor, loadInput ) {
    if( loadInput.cursorObject ) {
        _.assign( cursor, loadInput.cursorObject );
    } else if( loadInput.parentNode && loadInput.parentNode.cursorObject ) {
        _.assign( cursor, loadInput.parentNode.cursorObject );
    } else {
        /**
         * Going forward, we need need to use cursor information here if it is a scroll case.
         * <P>
         * If we use cursor, it will bring next set of children.
         * <P>
         * For normal expand (expand collapse expand use case), where user expects to see first page again, doing
         * scroll there doesn't make sense. We need information from CFX where it is scroll case or expand case
         */
        cursor.startReached = false;
        cursor.endReached = false;
        cursor.startIndex = loadInput.startChildNdx;
        cursor.endIndex = 0;
        cursor.pageSize = loadInput.pageSize;
        // We can not pass clientDataModelSvc.NULL_UID in startOccUid and endOccUid for following reason
        // 1. These are not uid they are pfuid from RTT_BOMLINE. specialized RM DFS mechanism for doing pagination.
        // 2. platform Requirement Management does not check for NULL_UID. They check for empty string ("")
        // 3. RM is implementing null uid check in server occmgmt layer to translate NULL_UID to "". Till they are done we need to continue passing empty string
        // 4. As of now passing NULL_UID causes server hang in flat navigation use-cases for 11.3 and above.
        cursor.startOccUid = '';
        cursor.endOccUid = '';
    }
};

var _populateFilterParameters = function( inputFilterString, filter, currentContext ) {
    var filterString = null;

    if( inputFilterString !== undefined && inputFilterString !== null ) {
        filterString = inputFilterString;
    } else {
        filterString = currentContext.currentState.filter;
    }

    filter.searchFilterCategories = [];
    filter.searchFilterMap = {};
    var recipe;

    // Populate filters/recipe only when filters are applied from this action OR when a filtered structure is being refreshed
    // or expanded
    if( currentContext.appliedFilters || filterString && !currentContext.updatedRecipe ) {
        if( currentContext.appliedFilters ) {
            recipe = currentContext.recipe;
            var appliedFilters = currentContext.appliedFilters;
            if( appliedFilters.filterCategories && appliedFilters.filterMap ) {
                filter.searchFilterCategories = appliedFilters.filterCategories;
                filter.searchFilterMap = appliedFilters.filterMap;
            }
        } else if( filterString ) {
            var categoriesInfo = aceFilterService.extractFilterCategoriesAndFilterMap( filterString );
            filter.searchFilterCategories = categoriesInfo.filterCategories;
            filter.searchFilterMap = categoriesInfo.filterMap;
            recipe = currentContext.recipe;
        }
    }
    //Populate recipe when recipe is modified via applying proximity or delete or operator change
    if( currentContext.updatedRecipe ) {
        recipe = currentContext.updatedRecipe;
    }

    filter.fetchUpdatedFilters = false;
    filter.recipe = [];

    var criteriaTypeStr = currentContext.requestPref.criteriaType;

    if( criteriaTypeStr ) {
        var recipeInfo = {
            criteriaType: criteriaTypeStr
        };

        filter.recipe.push( recipeInfo );
    }

    if( recipe ) {
        filter.recipe.push.apply( filter.recipe, recipe );
    }

    filter.searchFilterFieldSortType = 'Priority';
    filter.searchSortCriteria = [];
};

// eslint-disable-next-line complexity
var _populateConfigurationParameters = function( config, currentContext ) {
    if( !config.hasOwnProperty( 'productContext' ) ) {
        config.productContext = occmgmtUtils.getObject( currentContext.currentState.pci_uid );
    }

    var pci;

    if( currentContext.configContext ) {
        var configContext = currentContext.configContext;

        if( !_.isEmpty( configContext ) ) {
            config.endItem = occmgmtUtils.getObject( configContext.ei_uid );
            config.revisionRule = occmgmtUtils.getObject( configContext.r_uid );
            if( configContext.rev_sruid ) {
                config.serializedRevRule = configContext.rev_sruid;
            } else if( config.revisionRule.serializedRevRule ) {
                config.serializedRevRule = config.revisionRule.serializedRevRule;
            } else if( currentContext.serializedRevRule && config.productContext && _.isEqual( config.productContext.props.awb0CurrentRevRule.dbValues[0], configContext.r_uid ) ) {
                var swc = false;
                if( config.productContext.props.awb0ContextObject && config.productContext.props.awb0ContextObject.dbValues ) {
                     swc = clientDataModelSvc.getObject( config.productContext.props.awb0ContextObject.dbValues[ 0 ] );
                }
                if( !swc ) {
                    config.serializedRevRule = currentContext.serializedRevRule;
                }
            }

            config.svrOwningProduct = occmgmtUtils.getObject( configContext.iro_uid );

            if( clientDataModelSvc.isValidObjectUid( configContext.var_uid ) ) {
                config.variantRules = [ occmgmtUtils.getObject( configContext.var_uid ) ];
            }

            if( configContext.var_uids ) {
                config.variantRules = [];
                for( var i = 0; i < configContext.var_uids.length; i++ ) {
                    if( clientDataModelSvc.isValidObjectUid( configContext.var_uids[ i ] ) ) {
                        config.variantRules[ i ] = occmgmtUtils.getObject( configContext.var_uids[ i ] );
                    }
                }
            }

            // Add effectivityGroups
            if( configContext.eg_uids ) {
                config.effectivityGroups = [];
                for( var i = 0; i < configContext.eg_uids.length; i++ ) {
                    if( clientDataModelSvc.isValidObjectUid( configContext.eg_uids[ i ] ) ) {
                        config.effectivityGroups[ i ] = occmgmtUtils.getObject( configContext.eg_uids[ i ] );
                    }
                }
            }

            // Add Closure Rules
            if( configContext.cl_uid ) {
                if( clientDataModelSvc.isValidObjectUid( configContext.cl_uid ) ) {
                    config.closureRule = occmgmtUtils.getObject( configContext.cl_uid );
                }
            } else if( clientDataModelSvc.isValidObjectUid( currentContext.currentState.pci_uid ) ) {
                pci = occmgmtUtils.getObject( currentContext.currentState.pci_uid );
                if( pci && pci.props && pci.props.awb0ClosureRule ) {
                    var closureRuleUid = pci.props.awb0ClosureRule.dbValues[ 0 ];
                    if( clientDataModelSvc.isValidObjectUid( closureRuleUid ) ) {
                        config.closureRule = occmgmtUtils.getObject( closureRuleUid );
                    }
                }
            }

            // Add applied arrangement
            if( configContext.ar_uid ) {
                config.appliedArrangement = occmgmtUtils.getObject( configContext.ar_uid );
            }
            // Add View Types
            if( configContext.vt_uid ) {
                config.viewType = occmgmtUtils.getObject( configContext.vt_uid );
            }

            if( clientDataModelSvc.isValidObjectUid( configContext.org_uid ) ) {
                config.occurrenceScheme = occmgmtUtils.getObject( configContext.org_uid );
            } else if( clientDataModelSvc.isValidObjectUid( currentContext.currentState.pci_uid ) ) {
                pci = occmgmtUtils.getObject( currentContext.currentState.pci_uid );

                if( pci.props.fgf0PartitionScheme ) {
                    config.occurrenceScheme = pci.props.fgf0PartitionScheme;
                }
            }

            if( clientDataModelSvc.isValidObjectUid( configContext.baselinerev_uid ) ) {
                config.sourceContext = occmgmtUtils.getObject( configContext.baselinerev_uid );
            }

            if( configContext.de ) {
                config.effectivityDate = _convertDate( configContext.de );
            }

            config.unitNo = configContext.ue ? parseInt( configContext.ue ) : -1;

            var startDate = configContext.startDate;
            var fromUnit = configContext.fromUnit;
            var intentFormula = configContext.intentFormula;


            if( startDate || fromUnit || intentFormula ) {
                config.effectivityRanges = [];

                var effectivityRange = {};

                effectivityRange.dateIn = startDate;
                effectivityRange.dateOut = configContext.endDate;
                effectivityRange.unitIn = isNaN( fromUnit ) ? -1 : parseInt( fromUnit );
                effectivityRange.unitOut = isNaN( configContext.toUnit ) ? -1 : parseInt( configContext.toUnit );
                if( !_.isUndefined( intentFormula ) ) { //user has explicity applied the intent
                    effectivityRange.intentFormula = configContext.intentFormula;
                } else if( clientDataModelSvc.isValidObjectUid( currentContext.currentState.pci_uid ) ) { //Intent is already applied and then user is changing the other configuration then pass the already applied intent
                    pci = occmgmtUtils.getObject( currentContext.currentState.pci_uid );
                    if( pci && !_.isEmpty( pci ) && pci.props && pci.props.fgf0IntentFormulaList ) { //Needed this check for refresh scenario
                        effectivityRange.intentFormula = pci.props.fgf0IntentFormulaList.dbValues[0];
                    }else{
                        effectivityRange.intentFormula = '';
                    }
                }else {
                    effectivityRange.intentFormula = '';
                }

                config.effectivityRanges[ 0 ] = effectivityRange;
            }
        }
    }

    // Change context modified in configuration panel
    var changeContext;
    if( appCtxService.ctx.changeContext ) {
        changeContext = appCtxService.ctx.changeContext;
        if( clientDataModelSvc.isValidObjectUid( changeContext.uid ) ) {
            config.changeContext = changeContext;
        }
    } else {
        // Retain change context when other config parameters changed
        if( clientDataModelSvc.isValidObjectUid( currentContext.currentState.pci_uid ) ) {
            pci = occmgmtUtils.getObject( currentContext.currentState.pci_uid );
        } else if( currentContext.productContextInfo ) {
            pci = occmgmtUtils.getObject( currentContext.productContextInfo.uid );
        }
        if( pci && !_.isEmpty( pci ) && pci.props && pci.props.fgf0ChangeContext ) {
            config.changeContext = occmgmtUtils.getObject( pci.props.fgf0ChangeContext.dbValues[ 0 ] );
        }
    }

    // populate ProductContext for snapshot
    if( currentContext.currentState.snap_uid && currentContext.productContextInfo ) {
        config.productContext = currentContext.productContextInfo;
    }
};

var _populateSortCriteriaParameters = function( sortCriteria, loadInput ) {
    if( !_.isEmpty( loadInput.sortCriteria ) ) {
        sortCriteria.propertyName = loadInput.sortCriteria[ 0 ].fieldName;
        sortCriteria.sortingOrder = loadInput.sortCriteria[ 0 ].sortDirection;
    }
};

var _populateParametersForGetOccurrences =  function( loadInput, soaInput, currentContext ) {
    var inputData = soaInput.inputData;
    inputData.product = occmgmtUtils.getObject( currentContext.currentState.uid );

        inputData.parentElement = loadInput.parentElement;

        _populateConfigurationParameters( inputData.config, currentContext );

        if( inputData.config.productContext.uid === clientDataModelSvc.NULL_UID && loadInput.productContext ) {
            inputData.config.productContext = loadInput.productContext;
        }
        _populateCursorParameters( inputData.cursor, loadInput );

        if( !loadInput.skipFocusOccurrenceCheck ) {
            _populateFocusOccurrenceInputParameters( inputData, currentContext );
            if( inputData.focusOccurrenceInput.element === undefined && loadInput.focusInput !== null ) {
                inputData.focusOccurrenceInput.element = occmgmtUtils.getObject( loadInput.focusInput );
            }
        }

        // There are cases where we want to use filter parameters other than the one in the URL. In such cases the filter string is sent
        // in the input.
        if ( currentContext.populateFilterParamsFunc ) {
            currentContext.populateFilterParamsFunc( inputData.filter, currentContext );
        } else {
            _populateFilterParameters( loadInput.filterString, inputData.filter, currentContext );
        }
        occmgmtRequestPrefPopulatorService.populateRequestPrefParameters( inputData.requestPref, loadInput,
            currentContext, inputData.config );
        occmgmtRequestPrefPopulatorService.populateExpansionCriteriaParameters( inputData.expansionCriteria, currentContext );
        _populateSortCriteriaParameters( inputData.sortCriteria, loadInput );
};

var exports = {};

/**
 * @param {TreeLoadInput | ListLoadInput} loadInput - Object containing specific loading parameters and options.
 * @param {OccurrencesData} soaInput - Input structure to getOccurrences() SOA.
 * @param {CurrentAppContext} currentContext - Input current context
 * @returns {OccurrencesResponse} - Response from getOccurrences() SOA.
 */
export let getOccurrences = function( loadInput, soaInput, currentContext ) {
    var inputData = soaInput.inputData;
    var systemLocator = appCtxService.getCtx( 'systemLocator' );
    if ( systemLocator ) {
        occmgmtRequestPrefPopulatorService.populateRequestPrefParametersForLocator( inputData.requestPref,
            loadInput, currentContext );
    } else {
        _populateParametersForGetOccurrences( loadInput, soaInput, currentContext );
    }
    if( currentContext ) {
        currentContext.getOccInput = soaInput;
        currentContext.transientRequestPref = {};
    }
    return soaSvc.postUnchecked( 'Internal-ActiveWorkspaceBom-2022-06-OccurrenceManagement', 'getOccurrences4',
        soaInput ).then( function( response ) {
        var deferred = AwPromiseService.instance.defer();

        if( response.requestPref && response.requestPref.deltaTreeResponse &&
            response.requestPref.deltaTreeResponse[0].toLowerCase() === 'true' ) {
            // We are here, because server has sent delta response.
            // It is expected to merge the tree with this delta response.
            // So rebuild parent children info using existing tree and delta responsing and then
            // process response.
            occmgmtGetOccsResponseService.convertDeltaResponseToFullResponse( response, currentContext, loadInput.focusObjectHierarchy );
        }

        if( !loadInput.expandBelow && !_.isEmpty( response.parentChildrenInfos ) && !loadInput.focusLoadAction ) {
            response.occurrences = _.clone( _.last( response.parentChildrenInfos ).childrenInfo );
            if( response.parentChildrenInfos.length === 1 ) {
                response.parentOccurrence = _.clone( _.last( response.parentChildrenInfos ).parentInfo );
                delete response.parentChildrenInfos;
            }
        }

        if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
            occmgmtGetOccsResponseService.processPartialErrors( response );
        }
        deferred.resolve( response );
        return deferred.promise;
    }, function( error ) {
        occmgmtGetOccsResponseService.processFailedIndexError( error );
        throw soaSvc.createError( error );
    } );
};

/**
 * @returns {OccurrencesData} Input structure to getOccurrences() SOA with default values.
 */
export let getDefaultSoaInput = function() {
    return {
        inputData: {
            config: {
                effectivityDate: '0001-01-01T00:00:00',
                unitNo: -1
            },
            cursor: {},
            focusOccurrenceInput: {},
            filter: {},
            requestPref: {},
            expansionCriteria: {
                expandBelow: false,
                levelNExpand: 0,
                loadTreeHierarchyThreshold: 0,
                scopeForExpandBelow: ''
            },
            sortCriteria: {}
        }
    };
};

export default exports = {
    getOccurrences,
    getDefaultSoaInput
};
/**
 * @memberof NgServices
 * @member occmgmtGetService
 */
app.factory( 'occmgmtGetService', () => exports );
