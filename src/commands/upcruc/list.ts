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
    'tsv': flags.boolean({ description: messages.getMessage('flagOutputTsv'), char: 't', dependsOn: ['dir'] }), 
    'ical': flags.boolean({ description: messages.getMessage('flagOutputICal'), char: 'i', dependsOn: ['dir'] }), 
    'dir': flags.directory({ description: messages.getMessage('flagOutputDirectory'), char: 'd' }), 
    'json': flags.boolean({ description: 'format output as json'}) // shadow that standard json flag
  };

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
              return '(output to tsv)';
            default:
              return val.substr(0, 50); 
          }
        }
      })(this.crucs);
    }

    console.log(output); 
    process.exit(0); // TODO remove
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
    
    let path: string = this.flags.dir;
    path = (path.endsWith('/') ? path : `${path}/`) + 'crucs.tsv'; 
    fs.writeFileSync(path, tsv, { encoding: 'utf-8' });
  }

  private generateICal(): void {
    // TODO
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
