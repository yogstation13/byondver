import { request } from "http";
import { request as sreq } from "https";
import { parse } from "node-html-parser";
import { HTMLElement } from "node-html-parser"
import TextNode from "node-html-parser/dist/nodes/text"
import fs from "fs";
import path from "path";

try {
    fs.writeFileSync(path.resolve(__dirname, "../data/data.json"), "{\"version\": null}", {flag: "ax"});
}catch(e) {}

const data = require("../data/data.json");
const config = require("../data/config.json")

function sendMessage(obj: object){
    try {
        const body = JSON.stringify(obj);
        config.webhooks.forEach((url: string) => {
            const options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body)
                }
            };
            console.log(obj)
            const dreq = sreq(url, options);

            dreq.on("error", (e) => {
                console.error(`Error with request: ${e.message}`);
            });
            dreq.on("data", res => {
                res.pipe(process.stdout)
            });
            dreq.on("end", () => {
                debugger
            })
            dreq.write(body);
            dreq.end();
        })
    }catch(e){
        console.log(e)
    }
}


interface build {
    name: string,
    categories: category[]
}

interface category {
    name: string,
    link: string,
    programs: program[]
}

interface program {
    name: string,
    entries: string[]
}


const verreq = sreq("https://secure.byond.com/download/version.txt", res => {
    let byondver = "";
    res.setEncoding("utf8");
    res.on("data", chunk => {
        byondver += chunk;
    })
    res.on("end", () => {
        if (!res.complete) {
            console.error("Response is not complete");
            return;
        }
        byondver = byondver.trim() //yeets the newline at the end
        console.log(byondver)

        if(data.version === byondver) {
            console.log("Nothing to do");
            return
        }

        const req = request("http://www.byond.com/docs/notes/513.html", res => {
            let content = "";
            res.setEncoding("utf8");
            res.on("data", chunk => {
                content += chunk;
            })
            res.on("end", () => {
                if (!res.complete) {
                    console.error("Response is not complete");
                    return;
                }
                console.time("HTMLParsing")
                const htmlschema = parse(content/*.replace(/\n/g, "")*/);

                const children = htmlschema.querySelector("body").removeWhitespace().childNodes as HTMLElement[];

                children.shift(); //the first one is just the release notes header
                children.pop(); //the last one is just the footer for other release notes

                const builds: Array<build> = []
                let currentbuild: build
                let currentcat: category
                let currentprogram: program
                children.forEach(value => {
                    if(value.tagName === "h3") {
                        if(currentbuild) {
                            builds.push(currentbuild as build)
                        }
                        currentbuild = {
                            name: /Build (\d{3}\.\d{4})/.exec(value.text)![1],
                            categories: []
                        }
                    }
                    if(value.tagName === "p") {
                        if(value.childNodes.length === 4) {
                            currentcat = {
                                name: value.querySelector("u").text,
                                link: value.querySelector("a").getAttribute("href")!,
                                programs: []
                            }
                            currentbuild.categories.push(currentcat)
                        } else if(value.childNodes.length === 2) {
                            currentprogram = {
                                name: (value.childNodes[0] as TextNode).text,
                                entries: []
                            };
                            (value.childNodes[1] as HTMLElement).childNodes.forEach((ival) => {
                                const innervalue = ival as unknown as HTMLElement
                                if(innervalue.tagName === "li") {
                                    //@ts-ignore
                                    currentprogram.entries.push(innervalue.structuredText)
                                }
                            })

                            currentcat.programs.push(currentprogram)
                        }
                    }
                })
                console.timeEnd("HTMLParsing")
                console.log(builds)

                data.version = byondver
                fs.writeFileSync(path.resolve(__dirname, "../data/data.json"), JSON.stringify(data))

                const fields: {name: string, value:string}[] = [
                  /*  {
                        name: "\u200b",
                        value: ""
                    },
                    {
                        name: "BYONDexe",
                        value: "\u25CF owo\n\u25CF uwu"
                    }*/
                ]
                const selectedbuild = builds[0]
                const repoUrl = "https://github.com/yogstation13/byondver"
                const embed = {
                    username: "BYOND Changelog",
                    avatar_url: "https://cdn.discordapp.com/icons/81104451930165248/395762b8f813342035d9db71e3b16f1c.webp",
                    content: `BYOND version ${selectedbuild.name} released!`,
                    embeds: [
                        {
                            title: `BYOND version ${selectedbuild.name}`,
                            url: "http://www.byond.com/download/",
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Generated by [${repoUrl}](${repoUrl})`
                            },
                            fields
                        }
                    ],
                    allowed_mentions: {
                        parse: []
                    }
                }
                selectedbuild.categories.forEach(cat => {
                    fields.push({
                        name: "\u200b",
                        value: `**__[${cat.name}](${cat.link})__**`
                    })
                    cat.programs.forEach(prog => {
                        const entry = "\u25CF " + prog.entries.join("\n\u25CF ")
                        fields.push({
                            name: prog.name,
                            value: entry
                        })
                    })
                })
                sendMessage(embed)
            })
        });

        req.end();
    })
})
verreq.end()
