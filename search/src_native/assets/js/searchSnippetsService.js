//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/searchSnippetsService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import highlighterSvc from 'js/highlighterService';

/**
 * @param {ViewModelObject|ViewModelObjectArray} vmos - ViewModelObject(s) to modify.
 */
export let addSnippetsToVMO = function( vmos ) {
    var searchResponseInfo = appCtxSvc.getCtx( 'searchResponseInfo' );
    _.forEach( vmos, function( vmo ) {
        if ( vmo && searchResponseInfo && searchResponseInfo.searchSnippets && searchResponseInfo.searchSnippets[vmo.uid] ) {
            if ( !vmo.snippets ) {
                vmo.snippets = searchResponseInfo.searchSnippets[vmo.uid];
            }
        }
    } );
};

/**
 * Get search snippets
 * Expected response of searchSnippets list is in the below format for each object.
 *           {
 *              "rR1Ms1epgwwkB":{
 *                  "fileContentSnippet":[
 *                      "<em>Competitive</em> Dimensional Analysis"
 *                  ],
 *                  "fileNameSnippet":[
 *                     "<em>competition.pdf</em>"
 *                 ]
 *              }
 *           }
 * Output will be like this
 * {
 *    "rR1Ms1epgwwkB":  {
 *           "fileContentSnippet": "Competitive Dimensional Analysis",
 *          "fileNameSnippet": "competition.pdf"
 *      }
 *  }
 * @function getSearchSnippets
 * @param {Object} data - declViewModel
 *
 */
export let getSearchSnippets = function( data ) {
    let searchSnippets = {};
    let keywords = [];
    if( data.additionalSearchInfoMap !== undefined ) {
        let ssArray = data.additionalSearchInfoMap.searchSnippets;
        if( ssArray && ssArray.length > 0 ) {
            _.forEach( ssArray, function( ssEach ) {
                if( ssEach ) {
                    let snippet = {};
                    try {
                        snippet  = JSON.parse( ssEach );
                    } catch ( error ) {
                        console.log( 'Search input is not a valid json' );
                    }

                    for( var uid in snippet ) {
                        if( snippet.hasOwnProperty( uid ) ) {
                            let snippetObject = snippet[ uid ];
                            let displaySnippet = {};

                            if( snippetObject.fileContentSnippet && snippetObject.fileContentSnippet.length > 0 ) {
                                displaySnippet.fileContentSnippet = snippetObject.fileContentSnippet[0].replace( /<em>(.*?)<\/em>/g, function( match, keyword ) {
                                    keywords = _.union( keywords, [ keyword ] );
                                    return keyword;
                                } );
                            }
                            if( snippetObject.fileNameSnippet && snippetObject.fileNameSnippet.length > 0 ) {
                                displaySnippet.fileNameSnippet = snippetObject.fileNameSnippet[0].replace( /<em>(.*?)<\/em>/g, function( match, keyword ) {
                                    keywords = _.union( keywords, [ keyword ] );
                                    return keyword;
                                } );
                            }
                            searchSnippets[ uid ] = displaySnippet;
                        }
                    }
                }
            } );
        }
        if( keywords.length > 0 ) {
            data.additionalSearchInfoMap.searchTermsToHighlight = _.union( keywords, data.additionalSearchInfoMap.searchTermsToHighlight );
        }
        highlighterSvc.highlightKeywords( data.additionalSearchInfoMap.searchTermsToHighlight );
    }
    return searchSnippets;
};

const exports = {
    getSearchSnippets,
    addSnippetsToVMO
};
export default exports;

app.factory( 'searchSnippetsService', () => exports );
