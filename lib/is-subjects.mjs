// Curriculum names are reference metadata, not school exam questions or a complete syllabus.
export const IS_CURRICULA={
 general:{name:'General International Studies',version:'Core subject practice',url:''},
 feu:{name:'FEU - BA International Studies',version:'Area Studies curriculum, effective SY 2024-2025',url:'https://www.feu.edu.ph/wp-content/uploads/2026/02/BA-in-International-Studies-Specialization-in-Area-Studies.pdf'},
 ue:{name:'UE - BA International Studies',version:'Published curriculum listing AABIS2023',url:'https://apps.ue.edu.ph/p/curriculum.php?c=AABIS2023'}
};
export const CURRICULUM_CHECKED_AT='2026-11-13';
export const IS_READINGS={
 realism:{name:'Introducing Realism in International Relations Theory',publisher:'E-International Relations',url:'https://www.e-ir.org/p/introducing-realism-in-international'},
 liberalism:{name:'Introducing Liberalism in International Relations Theory',publisher:'E-International Relations',url:'https://www.e-ir.org/p/introducing-liberalism-in-international'},
 charter:{name:'United Nations Charter - full text',publisher:'United Nations',url:'https://www.un.org/en/about-us/un-charter/full-text'},
 constitution:{name:'1987 Constitution of the Philippines',publisher:'Supreme Court E-Library',url:'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/3/353'},
 organs:{name:'Main Bodies of the United Nations',publisher:'United Nations',url:'https://www.un.org/about-us/main-bodies'},
 asean:{name:'Association of Southeast Asian Nations - UN cooperation',publisher:'UN Department of Political and Peacebuilding Affairs',url:'https://dppa.un.org/en/association-of-southeast-asian-nations'},
 trade:{name:'What is the World Trade Organization?',publisher:'World Trade Organization',url:'https://www.wto.org/english/thewto_e/whatis_e/tif_e/fact1_e.htm'},
 sdgs:{name:'The 17 Sustainable Development Goals',publisher:'United Nations',url:'https://sdgs.un.org/goals'}
};
export const IS_SUBJECTS=[
 {id:'ir-theory',title:'International relations & politics',scope:'A starter comparison of realism and liberalism, states, power, cooperation and institutions.',readings:['realism','liberalism'],courses:{feu:{code:'ISC2102',title:'Theories of International Relations'},ue:{code:'AIS 2101',title:'International Politics'}}},
 {id:'international-law',title:'International law & treaties',scope:'UN Charter principles, obligations, peaceful settlement and collective security.',readings:['charter'],courses:{feu:{code:'ISC3104',title:'International Law'},ue:{code:'AIS 2102',title:'International Law and Treaties'}}},
 {id:'philippine-foreign-policy',title:'Philippine foreign policy',scope:'Constitutional principles of independent foreign policy, sovereignty and international relations.',readings:['constitution'],courses:{feu:{code:'ISC3101',title:'Philippine Foreign Relations'},ue:{code:'AIS 2103',title:'Philippine Foreign Policies'}}},
 {id:'diplomacy',title:'Diplomacy & conflict resolution',scope:'Negotiation, mediation, peaceful dispute settlement and diplomatic cooperation under the UN Charter.',readings:['charter'],courses:{feu:{code:'ISC3208',title:'Theory & Protocols of Diplomacy'},ue:{code:'AIS 3201',title:'Diplomatic and Consular Practices'}}},
 {id:'international-organizations',title:'International organizations & governance',scope:'The purposes and responsibilities of the UN main organs and multilateral institutions.',readings:['organs','charter'],courses:{feu:{code:'ISC3103',title:'International Organizations & Global Governance'},ue:{code:'AIS 3204',title:'International Organizations'}}},
 {id:'asean',title:'ASEAN & regional cooperation',scope:'ASEAN-UN cooperation, regional institutions, dialogue, peace and security.',readings:['asean'],courses:{feu:{code:'ISC4203',title:'ASEAN and its Dialogue Partners'},ue:{code:'AIS 3103',title:'The ASEAN (Southeast Asia)'}}},
 {id:'political-economy',title:'International economics & trade',scope:'Trade rules, negotiations, dispute settlement and the role of the WTO.',readings:['trade'],courses:{feu:{code:'ISC2204',title:'International Political Economy'},ue:{code:'AIS 3101',title:'International Economics'}}},
 {id:'development',title:'Development & global challenges',scope:'Sustainable Development Goals, development cooperation and social, economic and environmental priorities.',readings:['sdgs'],courses:{feu:{code:'ISC2101',title:'Theory and Practice of Development'},ue:{code:'ZGE 1102',title:'The Contemporary World'}}}
];
export function getSubject(id){return IS_SUBJECTS.find(subject=>subject.id===id)}
export function validatePracticeRequest(body){
 if(!body||!['quiz','flashcards'].includes(body.kind)||![3,5,10].includes(body.count)||!['beginner','intermediate','advanced'].includes(body.difficulty))return 'Choose a practice type, 3, 5, or 10 items, and a valid difficulty.';
 if(typeof body.focus!=='string'||body.focus.length>1000)return 'Focus must contain at most 1,000 characters.';
 if(body.mode==='general'){if(!getSubject(body.subjectId)||typeof body.school!=='string'||!Object.hasOwn(IS_CURRICULA,body.school))return 'Choose a listed subject and curriculum guide.';if(body.materials?.length)return 'General subject practice uses its reading sources. Choose My files to use uploads.';return null}
 if(body.mode!==undefined&&body.mode!=='materials')return 'Choose My files or General IS subjects.';
 return null;
}
