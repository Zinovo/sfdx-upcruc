import { flags, FlagsConfig } from '@salesforce/command';
import { Messages } from '@salesforce/core';

import { BaseCommand } from '../../lib/BaseCommand';
import * as asTable from 'as-table'; 
import * as fs from 'fs'; 

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-upcruc', 'list');

export default class CrucList extends BaseCommand {

  protected static requiresUsername = true;

  protected static flagsConfig: FlagsConfig = {
    'csv': flags.boolean({ description: messages.getMessage('flagOutputCsv'), char: 'c', dependsOn: ['dir'] }), 
    'ical': flags.boolean({ description: messages.getMessage('flagOutputICal'), char: 'i', dependsOn: ['dir'] }), 
    'dir': flags.filepath({ description: messages.getMessage('flagOutputDirectory'), char: 'd' }), 
    'json': flags.boolean({ description: 'format output as json'}) // shadow that standard json flag
  };

  public async run(): Promise<void> {
    await this.retrieveCrucs(); 

    // conditionally create docs
    if(this.flags.csv) this.generateCsv(); 
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
              return '(output to csv)';
            default:
              return val.substr(0, 50); 
          }
        }
      })(this.crucs);
    }

    console.log(output); 
    process.exit(0); // TODO remove
  }

  private generateCsv(): void {
    // TODO
  }

  private generateICal(): void {
    // TODO
  }

}
