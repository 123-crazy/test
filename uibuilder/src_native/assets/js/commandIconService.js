// Copyright (c) 2020 Siemens
/**
 * @module js/commandIconService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import graphQLSvc from 'js/graphQLService';
import appCtxSvc from 'js/appCtxService';
import graphQLModelSvc from 'js/graphQLModelService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import configurationSvc from 'js/configurationService';

// eslint-disable-next-line valid-jsdoc
/**
 * @member commandIconService
 * @memberof NgService
 */

var exports = {};

export let convertIconsToLovEntries = function( gqlResult ) {
    var gqlItems = _.get( gqlResult, 'data.icons' );

    if( gqlItems && gqlItems.length > 0 ) {
        return graphQLModelSvc.convertGqlItemsToLovEntries( gqlItems );
    }
    return [];
};

export let createIcon = function( data, prop ) {
    var deferred = AwPromiseService.instance.defer();
    if( data && data.files && data.files.length > 0 ) {
        var reader = new FileReader();
        reader.onload = function() {
            var iconId = data.fileNameNoExt.replace( /[0-9]+/, '' );
            var svg = reader.result.replace( /\n/g, '' );
            var graphQLQuery = {
                endPoint: 'graphql',
                request: {
                    query: 'mutation($iconId:ID!, $content:String!){addIcon(input:{id:$iconId,content:$content}){id}}',
                    variables: {
                        iconId: iconId,
                        content: svg
                    }
                }
            };
            return graphQLSvc.callGraphQL( graphQLQuery )
                .then( function() {
                    configurationSvc.add( 'images.' + iconId, svg );
                    var commandId = appCtxSvc.getCtx( 'selected' ).uid;
                    if( prop ) {
                        var propName = prop.propertyName;
                        if( propName === 'icon' ) {
                            graphQLQuery = {
                                endPoint: 'graphql',
                                request: {
                                    query: 'mutation($commandId:ID!, $iconId:ID!){updateCommandIcon(input:{id:$commandId,iconId:$iconId}){id icon{id url}}}',
                                    variables: {
                                        commandId: commandId,
                                        iconId: iconId
                                    }
                                }
                            };
                        } else if( propName === 'selectedIcon' ) {
                            graphQLQuery = {
                                endPoint: 'graphql',
                                request: {
                                    query: 'mutation($commandId:ID!, $iconId:ID!){updateSelectedCommandIcon(input:{id:$commandId,iconId:$iconId}){id selectedIcon{id url}}}',
                                    variables: {
                                        commandId: commandId,
                                        iconId: iconId
                                    }
                                }
                            };
                        }
                        return graphQLSvc.callGraphQL( graphQLQuery ).then( function( response ) {
                            var iconID = '';
                            if( propName === 'icon' ) {
                                iconID = _.get( response, 'data.updateCommandIcon.icon.id' );
                                exports.updateCommandIcon( _.get( response, 'data.updateCommandIcon.icon' ) );
                                eventBus.publish( 'commandSummary.updateSelectedObject', {
                                    propName: 'icon',
                                    propValue: iconID
                                } );
                            } else if( propName === 'selectedIcon' ) {
                                iconID = _.get( response, 'data.updateSelectedCommandIcon.selectedIcon.id' );
                                eventBus.publish( 'commandSummary.updateSelectedObject', {
                                    propName: 'selectedIcon',
                                    propValue: iconID
                                } );
                            }
                        } );
                    }
                    return 0;
                } )
                .then( deferred.resolve )
                .catch( deferred.reject );
        };
        reader.readAsText( data.files[ 0 ] );
    } else {
        deferred.resolve();
    }
    return deferred.promise;
};

export let updateCommandIcon = function( updatedIcon ) {
    if( updatedIcon ) {
        graphQLModelSvc.updateIcon( updatedIcon, appCtxSvc.ctx.selected );
    }
};

exports = {
    convertIconsToLovEntries,
    createIcon,
    updateCommandIcon
};
export default exports;
app.factory( 'commandIconService', () => exports );
