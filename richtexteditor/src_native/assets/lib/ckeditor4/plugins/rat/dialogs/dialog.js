function IsEmptyOrSpaces(str){
    return str == undefined || str.match(/^ *$/) != null;
}

CKEDITOR.dialog.add( 'ratDialog', function ( editor ) {
    return {
        title: 'RAT WS',
        minWidth: 400,
        minHeight: 200,

        contents: [
            {
                id: 'tab-basic',
                label: 'Connection Settings',
                elements: [
                    {
                        type: 'select',
                        id: 'protocol',
                        label: 'Select the established protocol',
                        items: [['http'], ['https']],
                        'default': 'https',
                        onChange: function( api ) {
                            CKEDITOR.RAT.protocol = ''+this.getValue();
                        }
                    },
                    {
                        type: 'text',
                        id: 'connDomain',
                        label: 'Domain',
                        default: CKEDITOR.RAT_CONFIG.connDomain,
                        validate: CKEDITOR.dialog.validate.notEmpty( "Domain field cannot be empty." )
                    },
                    {
                        type: 'text',
                        id: 'connPort',
                        label: 'Port',
                        default: CKEDITOR.RAT_CONFIG.connPort,
                        validate: CKEDITOR.dialog.validate.functions(
                            function(val) {
                                if(val.match(/6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|5\d{4}|[0-9]\d{0,3}/ig)){
                                    return true;
                                }
                                return false;
                                }, "Port format not correct")
                    },
                    {
                        type: 'text',
                        id: 'sitePath',
                        label: 'Site',
                        default: CKEDITOR.RAT_CONFIG.sitePath
                    },
                    {
                        type: 'text',
                        id: 'CompanyName',
                        label: 'Company',
                        default: CKEDITOR.RAT_CONFIG.CompanyName,
                        validate: CKEDITOR.dialog.validate.notEmpty( "User field cannot be empty." )
                    },
                    {
                        type: 'text',
                        id: 'CompanyCode',
                        label: 'Company Code',
                        default: CKEDITOR.RAT_CONFIG.CompanyCode,
                        validate: CKEDITOR.dialog.validate.notEmpty( "User field cannot be empty." )
                    },
                    {
                        type: 'text',
                        id: 'UserName',
                        label: 'User',
                        default: CKEDITOR.RAT_CONFIG.UserName,
                        validate: CKEDITOR.dialog.validate.notEmpty( "User field cannot be empty." )
                    },
                    {
                        type: 'text',
                        id: 'UserCode',
                        label: 'User Code',
                        default: CKEDITOR.RAT_CONFIG.UserCode,
                        validate: CKEDITOR.dialog.validate.notEmpty( "User field cannot be empty." )
                    }
                ]
            }
        ] ,       
    
        onOk: function() {

                if (!CKEDITOR.RAT) {
                    CKEDITOR.RAT = new Object();
                }

                CKEDITOR.RAT.user = this.getValueOf( 'tab-basic', 'UserName' );
                
                CKEDITOR.RAT.protocol = this.getValueOf('tab-basic', 'protocol');

                CKEDITOR.RAT.domain = this.getValueOf('tab-basic', 'connDomain');
                //}
                CKEDITOR.RAT.port = this.getValueOf('tab-basic', 'connPort');
                
                CKEDITOR.RAT.sitePath= this.getValueOf('tab-basic', 'sitePath');
                
                var url = "";
                if(!IsEmptyOrSpaces(CKEDITOR.RAT.protocol) && !IsEmptyOrSpaces(CKEDITOR.RAT.domain) && !IsEmptyOrSpaces(CKEDITOR.RAT.port)){
                    url = CKEDITOR.RAT.protocol+"://"+CKEDITOR.RAT.domain+":"+CKEDITOR.RAT.port;
                    if(!IsEmptyOrSpaces(CKEDITOR.RAT.sitePath)){
                        if(!CKEDITOR.RAT.sitePath.startsWith("/")){
                            url = url + "/";
                        }
                        url = url + CKEDITOR.RAT.sitePath;
                    }
                }
                if(IsEmptyOrSpaces(url)){
                    url = null;
                }else{
                    if(!url.endsWith("/")){
                        url = url + "/";
                    }
                    url = url + "trcapi.asmx";
                }

                CKEDITOR.RAT.WebServicePath = url;
                CKEDITOR.RAT.userCode = this.getValueOf( 'tab-basic', 'UserCode' );
                CKEDITOR.RAT.companyName = this.getValueOf( 'tab-basic', 'CompanyName' );
                CKEDITOR.RAT.companyCode = this.getValueOf( 'tab-basic', 'CompanyCode' );
                
                $.ajax({
                url : CKEDITOR.RAT.WebServicePath + '/Connect',
                data : { userName : this.getValueOf( 'tab-basic', 'UserName' ) , userCode : this.getValueOf( 'tab-basic', 'UserCode' ) , companyName : this.getValueOf( 'tab-basic', 'CompanyName' ) , companyCode : this.getValueOf( 'tab-basic', 'CompanyCode' ) },
             
                type : 'POST',
                dataType : 'xml',
                success : function(json) {
                     console.log(json.getElementsByTagName('SessionId').textContent);
                     if(json && json.getElementsByTagName("Success")[0].textContent == "true") {
                        CKEDITOR.RAT.ID = json.getElementsByTagName('SessionId')[0].textContent;
                        $.ajax({
                            url : CKEDITOR.RAT.WebServicePath + '/InitProject',

                            data : { 
                                sessionId : CKEDITOR.RAT.ID,
                                rms: 0,
                                rmsLogin: CKEDITOR.RAT_CONFIG.rmsLogin,
                                databaseServer: CKEDITOR.RAT_CONFIG.databaseServer,
                                databaseName: CKEDITOR.RAT_CONFIG.databaseName,
                                projectLocation: CKEDITOR.RAT_CONFIG.projectLocation,
                                projectName: CKEDITOR.RAT_CONFIG.projectName,
                                projectCode: CKEDITOR.RAT_CONFIG.projectCode,
                            },
                            type : 'POST',
                            dataType : 'xml',
                            crossDomain:true,
                            success : function(xml) {

                                if(xml.getElementsByTagName("Success")[0].textContent == "true"){
                                    $.ajax({
                                        url : CKEDITOR.RAT.WebServicePath + '/InitBlock',
                                        data : { 
                                            sessionId : CKEDITOR.RAT.ID,
                                            blockCode: CKEDITOR.RAT_CONFIG.blockCode,
                                            blockName: CKEDITOR.RAT_CONFIG.blockName,
                                            blockLocation: CKEDITOR.RAT_CONFIG.blockLocation,
                                            blockDescription: CKEDITOR.RAT_CONFIG.blockDescription,
                                            blockUrl: CKEDITOR.RAT_CONFIG.blockUrl
                                        },
                                        type : 'POST',
                                        dataType : 'xml',
                                    success : function(xml) {

                                        if(xml.getElementsByTagName("Success")[0].textContent == "true"){
                                            $.ajax({

                                                url :CKEDITOR.RAT.WebServicePath + '/HasBlockMetrics',
                                                data :     {     
                                                            sessionId : CKEDITOR.RAT.ID,
                                                        },
                                                type : 'POST',
                                                dataType : 'xml',
                                                success : function(xml) {
                                                    if(xml.getElementsByTagName("Result")[0].textContent == 'false'){
                                                        $.ajax({

                                                            url : CKEDITOR.RAT.WebServicePath + '/GetMetricsTemplateBlock',
                                                            data :     {     
                                                                        sessionId : CKEDITOR.RAT.ID,
                                                                    },
                                                            type : 'POST',
                                                            dataType : 'xml',
                                                            success : function(xml) {
                                                                console.log(xml.getElementsByTagName("MetricTemplate")[0].getElementsByTagName("metricTemplateCode")[0].textContent);
                                                                console.log(xml.getElementsByTagName("MetricTemplate")[0].getElementsByTagName("metricTemplateName")[0].textContent);

                                                                $.ajax({
                                                                    url : CKEDITOR.RAT.WebServicePath +  '/SetMetricsTemplateBlock',
                                                                    data :     {     
                                                                                sessionId : CKEDITOR.RAT.ID,
                                                                                metricsSetId: xml.getElementsByTagName("MetricTemplate")[0].getElementsByTagName("metricTemplateCode")[0].textContent,
                                                                                baseLineName: xml.getElementsByTagName("MetricTemplate")[0].getElementsByTagName("metricTemplateName")[0].textContent
                                                                            },
                                                                    type : 'POST',
                                                                    dataType : 'xml',
                                                                    success : function(xml) {
                                                                        //
                                                                    },
                                                                    error : function(data){
                                                                        console.log(data);
                                                                    }

                                                                });
                                                            },
                                                            error : function(data){
                                                                console.log(data);
                                                            }

                                                        });
                                                        
                                                    }
                                                },
                                                error : function(data){
                                                    console.log(data);
                                                }

                                            });

                                        }
                                        $.ajax({
                                            url : CKEDITOR.RAT.WebServicePath + '/InitRequirement',

                                            data : { 
                                                sessionId : CKEDITOR.RAT.ID,
                                                absoluteNumber: CKEDITOR.RAT_CONFIG.absoluteNumber,
                                                header: CKEDITOR.RAT_CONFIG.requirementHeader,
                                                description: '',
                                                url: CKEDITOR.RAT_CONFIG.url,
                                                authorName: CKEDITOR.RAT_CONFIG.authorName, 
                                                userName: CKEDITOR.RAT_CONFIG.userName,
                                                lastModificationUser: CKEDITOR.RAT_CONFIG.lastModificationUser,
                                                level: 0, 
                                                code: CKEDITOR.RAT_CONFIG.code,
                                                versionCount: 0,
                                                numOleObjects: 0, 
                                                moduleVolatilityCount: 0,
                                                authorEmailAddress: CKEDITOR.RAT_CONFIG.authorEmailAddress


                                            },
                                            type : 'POST',
                                            dataType : 'xml',
                                            success : function(xml) {                                                
                                                editor.fire("RatConnected");
                                            }
                                        });
                                    }
                                });

                            }

                            }
                        });
                    }
                },
                error : function(xhr, status) {
                    console.log('Error while connecting to Reuse API');
                    editor.eventBus.publish( "requirementDocumentation.errorWhileConnectingToReuseAPI" );
                },
                             
            });
            
        }
    };
});
