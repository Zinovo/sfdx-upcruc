import { flags, FlagsConfig } from '@salesforce/command';
import { Messages } from '@salesforce/core';

import { BaseCommand } from '../../lib/BaseCommand';
import * as asTable from 'as-table';
import * as ical from 'ical-generator';
import * as fs from 'fs';
import { VarargsConfig } from '@salesforce/command/lib/sfdxCommand';
const sha1 = require('crypto-js/sha1');  

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-upcruc', 'list');

const VAR_KEYS = ['fname', 'calprefix'];

export default class CrucList extends BaseCommand {

  protected static requiresUsername = true;

  protected static flagsConfig: FlagsConfig = {
    'tsv': flags.boolean({ description: messages.getMessage('flagOutputTsv'), char: 't' }), 
    'ical': flags.boolean({ description: messages.getMessage('flagOutputICal'), char: 'i' }), 
    'dir': flags.directory({ description: messages.getMessage('flagOutputDirectory'), char: 'd' }), 
    'json': flags.boolean({ description: 'format output as json'}), // shadow that standard json flag
    'verbose': flags.builtin({ description: 'do not limit length of rows printed to stdout' }), 
  };

  protected static varargs: VarargsConfig = { 
    required: false, 
    validator(key, val){
      if(!VAR_KEYS.includes(key))
        throw new Error(`${key} is invalid. Allowable keys are: ${VAR_KEYS}`); 
    }
  }

  public async run(): Promise<void> {
    await this.retrieveCrucs(); 

    // conditionally create docs
    if(this.flags.tsv) this.generateTsv(); 
    if(this.flags.ical) this.generateICal();

    // print to stdout
    let output;
    
    if(this.flags.json){
      output = this.crucs; 
    } else {
      output = asTable.configure({
        print: (val: string, key: string): string => {
          switch(key){
            case 'autoActivation':
              return val; 
            case 'activationUrl':
              return '(run with --verbose to print)';
            default:
              return this.flags.verbose ? val : val.substr(0, 50); 
          }
        }
      })(this.crucs);
    }

    console.log(output); 
    process.exit(0); // TODO remove
  }

  private getFilename(extension: string): string {
    const fname = this.varargs[VAR_KEYS[0]]; 
    if(fname)
      return `${fname}${extension.startsWith('.') ? extension : '.' + extension}`; 
      
    return `upcruc${extension}`;
  }

  private getFilePath(filename: string): string {
    // default to pwd if no dir flag
    const path = this.flags.dir ? this.flags.dir : process.cwd(); 
    return `${path.endsWith('/') ? path : path + '/'}${filename}`;
  }

  private getEventPrefix(){
    const prefix = this.varargs[VAR_KEYS[1]]; 
    return (prefix ? prefix : `Critical Update (${this.org.getUsername()}): `)
  }

  private generateTsv(): void {
    let tsv = '';  
    Object.keys(this.crucs[0]).forEach(key => {
      tsv += `${key}\t`; 
    }); 
    tsv += '\n';
    this.crucs.forEach(cruc => {
      Object.entries(cruc).forEach(entry => {
        tsv += `${sanitize(entry[0], entry[1])}\t`; 
      });
      tsv += '\n'; 
    });
    
    fs.writeFileSync(this.getFilePath(this.getFilename('.tsv')), tsv, { encoding: 'utf-8' });
  }

  private generateICal(): void {
    let evts: ical.EventData[] = []; 
    const orgId = this.org.getOrgId(); 
    this.crucs.forEach((cruc) => {
      // format data
      let dt = new Date(cruc.autoActivation),
          summary = `${this.getEventPrefix()} ${decodeURIComponent((cruc.name.length > 40 ? cruc.name.substr(0, 40) + '...' : cruc.name))}`,
          fullUrl = `${this.org.getConnection().instanceUrl}${cruc.activationUrl}`,
          uuid = sha1(`${orgId}${cruc.activationUrl}`).toString(); // sha-1 hash, unique for each org domain
      // create event
      let event: ical.EventData = {
        id: uuid, 
        start: dt,
        end: dt, 
        allDay: true, 
        busystatus: 'free', 
        summary: summary, 
        description: `${decodeURIComponent(cruc.description)}\n\nActivation URL:\n${fullUrl}`, 
        htmlDescription: `<b>${cruc.description}</b><br /><br /><a href="${fullUrl}">Click to begin Activation</a>`
      }; 
      evts.push(event); 
    }); 
    // create calendard
    const cal = ical({
      events: evts
    }); 
    // write file
    cal.saveSync(this.getFilePath(this.getFilename('.ical'))); 
  }

}

function sanitize(key: string, val: string): string {
    switch(key){
      case 'activationUrl':
         return val;
      default:
        return val.replace('\t', ' ').replace('\n', ' ');
    }
}
