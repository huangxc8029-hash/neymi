import type {FieldRef} from '../../../domain/types';

export type DesignerPhase='idle'|'collecting'|'confirming'|'ready'|'generating'|'proposal'|'applied';
export type DesignerSlots={
  displayName?:string;role?:string;organization?:string;
  purposeType?:'job'|'partner'|'sales'|'fundraise'|'research'|'social'|'general'|'other';
  desiredOutcome?:string;
  audienceMode?:'person'|'group'|'general';audienceRole?:string;audienceOrganization?:string;
  highlightRefs:string[];primaryHighlightRef?:string;
  tone:'clear'|'friendly'|'bold';density:'compact'|'normal';language:'zh'|'en'|'bilingual';templatePreference?:string;
};
export type DesignerEvidence={id:string;sourceId:string;sourceRevision:number;quote:string;start:number;end:number;status:'candidate'|'confirmed'|'rejected'};
export type DesignerSlotCandidate={field:string;value:unknown;evidenceIds?:string[]};
export type DesignerProposal={
  templateId:string;alternatives:string[];rationale:string;identityFieldRefs:Array<'name'|'company'|'role'>;
  modules:Array<{sourceModuleId?:string;kind:string;title:string;items:Array<{label:string;text:string;evidenceIds:string[];treatment:'verbatim'|'rewrite';needsConfirmation:boolean}>;evidenceIds:string[]}>;
  proposedFieldRefs:FieldRef[];omissions:Array<{evidenceId:string;reason:string}>;missingInformation:string[];
};
export type DesignerTemplateCapabilities={templateIds:string[];evidenceIds:string[];fieldRefs:FieldRef[]};
export type DesignerQuestion={field:string;text:string;choices:string[]};
