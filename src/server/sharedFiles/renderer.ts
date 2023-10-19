import { renderFile } from "ejs";
import path from "path";

const template = (file: string) => path.join(process.cwd(), "views", file);

export async function render(file: string, pageVar: any) {
    const page = await renderFile(template(file), pageVar);
    return new Response(page, {headers:{
        "Content-type": "text/html"
    }})
}


