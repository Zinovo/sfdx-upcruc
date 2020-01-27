/** sfdx imports */
import { SfdxCommand } from '@salesforce/command';
/** unique imports */
import { CRUC, CrucOptions, getCrucs } from 'upcruc';
import { exec } from 'child_process'; 
import { URL } from 'url';

export abstract class BaseCommand extends SfdxCommand {

  protected static requiresUsername = true; 

  protected crucs: CRUC[]; 

  protected async retrieveCrucs(): Promise<CRUC[]> {

    let options: CrucOptions = {
        runHeadless: true, 
        baseUrl: this.org.getConnection().instanceUrl
    };

    this.crucs = await new Promise(async (resolve, reject) => {
        // introspect url
        exec(`sfdx force:org:open -u ${this.org.getUsername()} -r --json`, async (err, stdout, stderr) => {
            if(stdout){
                // construct URL and get sessionId
                options.sessionId = new URL(JSON.parse(stdout).result.url).searchParams.get('sid'); 
                resolve(await getCrucs(options));
            } else{
                reject(err ? err : stderr); 
            }
        });
    }); 

    return this.crucs; 
  }

  abstract async run(): Promise<void>;
}
