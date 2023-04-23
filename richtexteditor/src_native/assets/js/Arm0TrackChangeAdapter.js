//@<COPYRIGHT>@
//==================================================
//Copyright 2021.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/* global
   CKEDITOR5
*/

/**
 * This Plugin is the adapter between track changes plugin and AW.
 *
 * @module js/Arm0TrackChangeAdapter
 */

import markupViewModel from 'js/Arm0MarkupViewModel';

export default class TrackChangesAdapter extends CKEDITOR5.Plugin {
    constructor( editor ) {
        super( editor );
    }

    init() {
        const usersPlugin = this.editor.plugins.get( 'Users' );
        const trackChangesPlugin = this.editor.plugins.get( 'TrackChanges' );
        const editor = this.editor;
        // Set the adapter to the `TrackChanges#adapter` property.
        trackChangesPlugin.adapter = {
            getSuggestion: suggestionId => {
                console.log( 'Getting suggestion', suggestionId );
                var trackChangesMap = markupViewModel.getTrackChangesMap();
                if( trackChangesMap.has( suggestionId ) ) {
                    var suggestion = trackChangesMap.get( suggestionId );
                    return Promise.resolve( suggestion[0] );
                }
            },

            addSuggestion: suggestionData => {
                console.log( 'Suggestion added', suggestionData );
                var trackChangesMap = markupViewModel.getTrackChangesMap();
                var threadId = suggestionData.id;

                let definedUser = usersPlugin.me;
                var authorId = definedUser.id;
                let objId = null;
                var usersMap = markupViewModel.getUsersMap();
                var usersArray = markupViewModel.getUsers();
                if( authorId ) {
                    if( usersMap.has( authorId ) ) {
                        var user = usersMap.get( authorId );
                        if( user ) {
                            suggestionData.authorId = user.userid;
                            suggestionData.displayname = user.displayname;
                            suggestionData.username = user.username;
                            suggestionData.initial = user.initial;
                        }
                    }else if( usersArray ) {
                        usersArray.forEach( element => {
                        if( element.userid === authorId ) {
                            suggestionData.authorId = element.userid;
                            suggestionData.displayname = element.displayname;
                            suggestionData.username = element.username;
                            suggestionData.initial = element.initial;
                            if( !usersMap.has( element.initial ) ) {
                                usersMap.set( element.initial, element );
                            }
                        }
                        } );
                    }
                }
                //Find Requirement Node from the dom range for getting the Revision Id on the requirement
                var currentSelection = document.getSelection();
                if( currentSelection && currentSelection.focusNode ) {
                    var reqNode = getTopRequirementElement( currentSelection.focusNode );
                    if( reqNode ) {
                        objId = reqNode.getAttribute( 'revisionId' );
                        if( objId ) {
                            suggestionData.objId = objId;
                        }
                    }
                }
                if( !trackChangesMap.has( threadId ) ) {
                    suggestionData.isTrackChange = true;
                    suggestionData.createdAt = new Date();
                    trackChangesMap.set( threadId, [ suggestionData ] );
                }

                return Promise.resolve( {
                    createdAt: new Date()
                } );
            },

            updateSuggestion: ( id, suggestionData ) => {
                console.log( 'Suggestion updated', id, suggestionData );
                var trackChangesMap = markupViewModel.getTrackChangesMap();
                if( suggestionData && suggestionData.state && suggestionData.state === 'accepted'
                 && trackChangesMap.has( id ) ) {
                    trackChangesMap.delete( id );
                }
                if( suggestionData && suggestionData.hasComments && suggestionData.hasComments === true
                    && trackChangesMap.has( id ) ) {
                    var trackChanges = trackChangesMap.get( id );
                    trackChanges[0].hasComments = suggestionData.hasComments;
                }
                return Promise.resolve();
            }
        };
    }
}

/**
 * Gets the dom.element closest to the 'node'
 *
 * @param {dom.node}
 *            node Start the search from this node.
 * @returns {dom.element/null} Element or
 *          `null` if not found.
 */
function getTopRequirementElement( node ) {
    if( !node ) {
        return null;
    }
    if( node.classList && node.classList.contains( 'requirement' ) ) {
        return node;
    }

    return getTopRequirementElement( node.parentNode );
}
