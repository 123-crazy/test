//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Csi1PropagateOrRollupService
 */
import app from 'app';
import cmm from 'soa/kernel/clientMetaModel';

var exports = {};

//Method goes through items that were propagated/rolled up, figures out what sections they belonged to, and generates strings for the message to use
//Example results in English might be "Problem, Impacted" & "Reference" which plug into a message.
//An example message in English would read "Problem, Impacted and Reference contents were propagated from (Change) to (Schedule)."
export let countRelations = function( created, modelObjects, i18nProblem, i18nImpacted, i18nSolution, i18nReference ) {
    var hasProblem = false;
    var hasImpacted = false;
    var hasSolution = false;
    var hasReferences = false;
    //count determines whether the message is for no relations, one relation or multiple relations
    var count = 0;

    for( var index in created ) {
        var creation = modelObjects[ created[ index ] ];
        //What's important is whether or not the relationship type is present, so only the first of each type increments the count.
        if( cmm.isInstanceOf( 'CMHasProblemItem', creation.modelType ) && !hasProblem ) {
            hasProblem = true;
            count++;
        }
        if( cmm.isInstanceOf( 'CMHasImpactedItem', creation.modelType ) && !hasImpacted ) {
            hasImpacted = true;
            count++;
        }
        if( cmm.isInstanceOf( 'CMHasSolutionItem', creation.modelType ) && !hasSolution ) {
            hasSolution = true;
            count++;
        }
        if( cmm.isInstanceOf( 'CMReferences', creation.modelType ) && !hasReferences ) {
            hasReferences = true;
            count++;
        }
    }
    //this returns all the relevant data to the json file. "one" and "two" plug into messages, "one" going before the "and" and "two" going after.
    //count is used to determine the message which is used.
    var contentStrings = {
        "one": "",
        "two": "",
        "count": count
    };
    if( count < 1 ) {
        return contentStrings;
    }
    //The categories are listed in the same order every time.
    var stringBuild = [];
    if( hasProblem ) {
        stringBuild.push( i18nProblem );
    }
    if( hasImpacted ) {
        stringBuild.push( i18nImpacted );
    }
    if( hasSolution ) {
        stringBuild.push( i18nSolution );
    }
    if( hasReferences ) {
        stringBuild.push( i18nReference );
    }
    //If there's only 1 relation then only one string needs to be returned
    if( count === 1 ) {
        contentStrings.one = stringBuild[ 0 ];
        return contentStrings;
    }

    //Otherwise the last string is put into "two" and "one" lists the previous relations separated by commas.
    for( var indexB in stringBuild ) {
        if( indexB === String( count - 1 ) ) {
            contentStrings.two = stringBuild[ indexB ];
        } else if( indexB === String( count - 2 ) ) {
            contentStrings.one += stringBuild[ indexB ];
        } else {
            contentStrings.one += stringBuild[ indexB ];
            contentStrings.one += ", ";
        }
    }
    return contentStrings;

};

export default exports = {
    countRelations
};
app.factory( 'Csi1PropagateOrRollupService', () => exports );
