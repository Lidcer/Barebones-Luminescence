import { doesNotReject } from "assert";
import { exec } from "child_process";

export function execute(command: string) {
  return new Promise<string>((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
        if (error) {
            return reject(error);
        }
        if (stderr) {
            return resolve(stderr);
        }
        return resolve(stdout);
    });
  })
}