//React
import React, { useState, useEffect } from 'react';
import * as ReactDOM from 'react-dom';
import structuredClone from '@ungap/structured-clone';
import { rejects } from 'assert';


function LookupInformationControl(props:any) {

    //Testing
    var DATA_SOURCE = "CRM"

    let href = window!.top!.location.href;
    if(href.indexOf("127.") > -1 || href.indexOf("localhost") > -1) {
      DATA_SOURCE="TEST";
    }

    var CRM_TEST_MODE = 1;

    //Data Definitions
    class CFieldData {
        logicalname:string;
        type:string;
        displaytext:string;
        options:[];
        showvalue:string;
        
        constructor(displaytext?:string, showvalue?:string) {
            if(displaytext) {
                this.displaytext = displaytext;
            }
            if(showvalue) {
                this.showvalue = showvalue;
            }
        };
    }
    
    class CSubgridData {
        entityname: string;
        lookupfieldname: string;
        data: Array<Array<CFieldData>>;
    }

    //State
    const [contentVisible, setContentVisible] = React.useState({ 
        visible: false
    });

    const [recordData, setRecordData] = React.useState({ 
        data: new Array<CFieldData>()
    });

    const [subgridData, setSubgridData] = React.useState({ 
        data: new Array<CSubgridData>()
    });

    //Init
    //Get current record data
    //let currentFntityId = (props.context.mode as any).contextInfo.entityId;
    //let currentEntityTypeName = (props.context.mode as any).contextInfo.entityTypeName;
    //let currentEntityRecordName = (props.context.mode as any).contextInfo.entityRecordName;

    //Get currentcControl field value
    let lookupfield_currentValue = props.context.parameters.BoundLookupField.raw[0];
    let lookupfield_currentId = lookupfield_currentValue.id;
    let lookupfield_currentEntityType = lookupfield_currentValue.entityType;
    let lookupfield_currentRecordName = lookupfield_currentValue.name;

    //Get PCF Config
    let config_fields:Array<string> = [];
    let config_lists:string = "";

    if(props.context.parameters.Fields.raw!=null) {
        config_fields = props.context.parameters?.Fields?.raw.split(",");
    }

    if(props.context.parameters?.Lists?.raw!=null) {
        config_lists = props.context.parameters?.Lists?.raw;
    }

    //Load Data
    function loadSubgridData() {

        let subgridsArr: Array<CSubgridData> = new Array<CSubgridData>();
        let subgridConfigs:Array<string> = config_lists.split("/"); //[entityname],[lookupname],[fieldname1];[fieldnameN]/..
        
        let subgridLoadPromises:Array<Promise<any>> = new Array<Promise<any>>();
        subgridConfigs.forEach((item:string) => {

            let sgd: CSubgridData = new CSubgridData();
            let arr:Array<string> = item.split(",");
            sgd.entityname = arr[0];
            sgd.lookupfieldname = arr[1];
            sgd.data = new Array<Array<CFieldData>>();
            let fieldsArr:Array<string> = arr[2].split(";");

            let fieldsDefinitions: Array<CFieldData> = new Array<CFieldData>();

            fieldsArr.forEach((item:string) => {
                let fieldmd:CFieldData = new CFieldData();
                fieldmd.logicalname = item;
                fieldsDefinitions.push(fieldmd);
            });

            subgridsArr.push(sgd);
            
            //Load data for subgrids
            let subgridLoadPromise = loadFieldsData(sgd.entityname, fieldsDefinitions, sgd.lookupfieldname, lookupfield_currentId, sgd.data);
            subgridLoadPromises.push(subgridLoadPromise);
        });

        Promise.all(subgridLoadPromises)
        .then((res:any) => {
            console.log(res);
            setSubgridData({"data":subgridsArr}); //subgridData, setSubgridData,  data: new Array<CSubgridData>()
        })
        .catch((e:any) => {
            console.error("Error loading subgrid data: " + e);
            alert("Error loading subgrid data: " + e);
        });
    }
    
    function loadFieldsData(entityname:string, fieldsDefinitions:Array<CFieldData>, lookupfieldname?:string, baserecordid?:string, subgridRecords?:Array<Array<CFieldData>>) {

        return new Promise((resolve, reject) => {

            const sfieldNames = fieldsDefinitions.map((item:CFieldData) => item.logicalname);
            
            props.context.utils.getEntityMetadata(entityname, sfieldNames).then(function(res:any) {
                
                let metaData = res.Attributes._collection;

                fieldsDefinitions.forEach(function(field:CFieldData) {
                    let metaField = metaData[field.logicalname];
                    
                    if(metaField!=null) {
                        field.displaytext=metaField._displayName != null ? metaField._displayName : "";
                        field.type = metaField._attributeTypeName; //"string", "lookup", "owner", "status", "datetime", "picklist", "integer", "decimal", "memo"
                        field.options = [];
                        field.showvalue="";
                        if(field.type=="picklist") {
                            //res.Attributes._collection.dev_picklist1.OptionSet["3543545"].text
                        }
                    }
                    else {
                        console.error("Field " + field.logicalname + " does not exist");
                        alert("Field " + field.logicalname + " does not exist");
                    }
                });

                if(lookupfieldname==null || lookupfieldname=="") {
                    props.context.webAPI.retrieveRecord(entityname, baserecordid).then(function(res:any) {
                        fieldsDefinitions.forEach(function(metafield:CFieldData) {
                            if(res[metafield.logicalname]!=null) {
                                metafield.showvalue = String(res[metafield.logicalname]);
                            }
                        });
                        resolve("");
                    });
                } 
                else {
                    
                    //Retrieve multiple subgrid records
                    let sfieldsFetch = "";
                    
                    fieldsDefinitions.forEach(function(field:CFieldData) {
                        sfieldsFetch += "<attribute name='"+field.logicalname+"' />"
                    });
                    
                    let fetchXML = `<fetch distinct='false' mapping='logical'>
                                        <entity name='`+entityname+`'>
                                            FIELDS
                                            <filter>
                                                <condition attribute='PARENT_LOOKUP_FIELD' operator='eq' value='PARENT_RECORD_ID' />
                                            </filter>
                                        </entity>
                                    </fetch>`;
                    
                    fetchXML = fetchXML.replace("FIELDS", sfieldsFetch);
                    fetchXML = fetchXML.replace("PARENT_RECORD_ID", baserecordid != null ? baserecordid : "");
                    fetchXML = fetchXML.replace("PARENT_LOOKUP_FIELD", lookupfieldname);
                    
                    console.log("fetch sub records fetchxml: " + fetchXML);

                    props.context.webAPI.retrieveMultipleRecords(entityname, `?fetchXml=${fetchXML}`).then(
                        (resp: ComponentFramework.WebApi.RetrieveMultipleResponse) => {
                            let recordLoopCount = 0;

                            resp.entities.forEach((entityRecord: ComponentFramework.WebApi.Entity) => {
                                recordLoopCount++;
                                let subgridRecord = new Array<CFieldData>();
                                subgridRecords!.push(subgridRecord);

                                fieldsDefinitions.forEach((metafield:CFieldData) => {
                                    if(entityRecord[metafield.logicalname]!=null) {
                                        let recordField = structuredClone(metafield);
                                        recordField.showvalue = String(entityRecord[metafield.logicalname]);
                                        subgridRecord.push(recordField);
                                    }
                                });

                                if(recordLoopCount>=resp.entities.length) {
                                    resolve("");
                                }
                            });
                        },
                    (errorResp:any) => {
                        console.error("Error fetching subrecords: " + errorResp);
                        reject("Error fetching subrecords: " + errorResp);
                    });
                }
            }, function(metadataErr:any){
                console.error("Error fetching metadata: " + metadataErr);
                reject("Error fetching metadata: " + metadataErr);
            });
        })        
    }

    function loadLookupValueFieldData() {
        let fieldsMetadata:Array<CFieldData> = new Array<CFieldData>();

		props.context.utils.getEntityMetadata(lookupfield_currentEntityType, config_fields).then(function(res:any) {
            
            let metaData = res.Attributes._collection;

            config_fields.forEach((cfieldname:string) => {
                let metaField = metaData[cfieldname];
                let fieldmd:CFieldData = new CFieldData();
                if(metaField!=null) {
                    fieldmd.displaytext=metaField._displayName != null ? metaField._displayName : "";
                    fieldmd.logicalname=cfieldname;
                    fieldmd.type = metaField._attributeTypeName; //"string", "lookup", "owner", "status", "datetime", "picklist", "integer", "decimal", "memo"
                    fieldmd.options = [];
                    fieldmd.showvalue="";
                    if(fieldmd.type=="picklist") {
                        //res.Attributes._collection.dev_picklist1.OptionSet["3543545"].text
                    }
                }
                else {
                    console.error("Field " + cfieldname + " does not exist");
                    alert("Field " + cfieldname + " does not exist");
                }
                
                fieldsMetadata.push(fieldmd);
            });

            props.context.webAPI.retrieveRecord(lookupfield_currentEntityType, lookupfield_currentId).then(function(res:any) {

                fieldsMetadata.forEach((metafield:CFieldData) => {
                    if(res[metafield.logicalname]!=null) {
                        metafield.showvalue = String(res[metafield.logicalname]);
                    }
                });

                setRecordData({"data": fieldsMetadata});

            });
		});
    }
    
    //Init panel data
    useEffect(() => {

        if(DATA_SOURCE=="TEST") {
            
            //Lookup Record Test Data
            let testRecordData:Array<CFieldData> = new Array<CFieldData>();
            testRecordData.push(new CFieldData("Name", "Component X543"))
            testRecordData.push(new CFieldData("Type", "X543"))
            testRecordData.push(new CFieldData("Level", "543"))
            setRecordData({"data": testRecordData});

            //Subgrids Test Data
            let testSubgridsData:Array<CSubgridData> = new Array<CSubgridData>();

            //Subgrid 1
            let testSubgridData = new CSubgridData();
            testSubgridData.entityname = "Component X";
            testSubgridData.data = new Array<Array<CFieldData>>();
            let fields1 = new Array<CFieldData>();
            fields1.push(new CFieldData("Name", "SubComponent Y323"));
            fields1.push(new CFieldData("Type", "Y323"));
            fields1.push(new CFieldData("Level", "323"));
            testSubgridData.data.push(fields1);
            let fields1_1 = new Array<CFieldData>();
            fields1_1.push(new CFieldData("Name", "SubComponent Y3231"));
            fields1_1.push(new CFieldData("Type", "Y3231"));
            fields1_1.push(new CFieldData("Level", "3231"));
            testSubgridData.data.push(fields1_1);

            //Subgrid 2
            let testSubgridData2 = new CSubgridData();
            testSubgridData2.entityname = "Component Y";
            testSubgridData2.data = new Array<Array<CFieldData>>();
            let fields2 = new Array<CFieldData>();
            fields2.push(new CFieldData("Name", "SubComponent Y555"));
            fields2.push(new CFieldData("Type", "Y555"));
            fields2.push(new CFieldData("Level", "555"));
            testSubgridData2.data.push(fields2);
            
            //Set state
            testSubgridsData.push(testSubgridData);            
            testSubgridsData.push(testSubgridData2);
            setSubgridData({"data": testSubgridsData});

        }
        else {

            loadLookupValueFieldData();
            loadSubgridData();
            
        }

    }, []);
    
    function onShow() {
        setContentVisible({visible:true});
    }

    function onHide() {
        setContentVisible({visible:false});
    }

    let lookupInputStyle:any = {width:"70%", height:"10px", borderLeft:"45px solid transparent", borderRight:"45px solid transparent", borderTop:"10px solid aliceblue"};
    let contentStyle:any = {width:"800px", height:"800px", display:"none"};
    let trstyle = {width:"100%"};
    let tdstyle = {width:"50%"};
    let subgridheaderstyle = {fontWeight:"bold"};

    if(contentVisible.visible) {
        contentStyle = {width:"800px", height:"800px", display:"block"};
    }

    if(CRM_TEST_MODE==1) {
        contentStyle = {width:"800px", height:"800px", display:"block"};
    }

    let itemsTable = recordData.data.map((item:CFieldData) =>
        <>
            <tr style={trstyle}><td style={tdstyle}>{item.displaytext}</td><td style={tdstyle}>{item.showvalue}</td></tr>
        </>
    );

    let subgridTable = subgridData.data.map((subgrid:CSubgridData) =>
        <>
            <tr><td><p style={subgridheaderstyle}>{subgrid.entityname}</p></td><td></td></tr>
            {subgrid.data.map((subgridRecordFields:Array<CFieldData>) =>
                <>
                {subgridRecordFields.map((subgridRecordField:CFieldData) =>
                    <>
                        <tr style={trstyle}><td style={tdstyle}>{subgridRecordField.displaytext}</td><td style={tdstyle}>{subgridRecordField.showvalue}</td></tr>
                    </>
                )}
                <tr><td></td><td></td></tr>
                </>
            )}
            <tr><td></td><td></td></tr>
        </>
    );
    
    return (
        <>
            <div onMouseEnter={onShow} onMouseLeave={onHide} style={lookupInputStyle}></div>
            <table>
                {itemsTable}
            </table>
            <br/>
            <table>
                {subgridTable}
            </table>
        </>
    );
}

/*
private performLookupObjects(entityType: string, viewId: string, setSelected: (value: ComponentFramework.LookupValue, update?: boolean) => void): void {
    // Used cached values from lookup parameter to set options for lookupObjects API
    const lookupOptions = {
    defaultEntityType: entityType,
    defaultViewId: viewId,
    allowMultiSelect: false,
    entityTypes: [entityType],
    viewIds: [viewId]
    };
    
    this._context.utils.lookupObjects(lookupOptions).then((success) => {
        if (success && success.length > 0) {
        // Cache the necessary information for the newly selected entity lookup
        const selectedReference = success[0];
        const selectedLookupValue: ComponentFramework.LookupValue = {
            id: selectedReference.id,
            name: selectedReference.name,
            entityType: selectedReference.entityType
        };
        // Update the primary or secondary lookup property
        setSelected(selectedLookupValue);
        // Trigger a control update
        this._notifyOutputChanged();
    } else {
        setSelected({} as ComponentFramework.LookupValue);
    }
    }, (error) => {
        console.log(error);
    });
}
*/

export function Render(context:any, container:any, theobj:object) {
    ReactDOM.render(
            <div><LookupInformationControl context={context} theobj={theobj} /></div>
        , container
      );
}

