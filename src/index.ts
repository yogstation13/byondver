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

function sendMessage(obj: message){
    try {
        const body = JSON.stringify(obj);
        config.webhooks.forEach((url: string) => {
            const options = {
                host: "localhost",
                port: 8888,
                path: url,
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            };
            console.log(obj)
            const dreq = request(options);

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

interface message {
    username: string,
    avatar_url: string,
    content: string,
    embeds: {
            title: string,
            url: string,
            timestamp: string,
            footer: {
                text: string
            },
            fields: {
                name: string,
                value:string
            }[]
    }[],
    allowed_mentions: {
        parse: string[]
    }
}

enum Channel {
    Stable= "version",
    Beta = "betaversion"
}

const ChannelName = {
    [Channel.Stable]: "Stable",
    [Channel.Beta]: "Beta"
}


function doVersion(version: string, channel: Channel) {
    if(data[channel] === version) {
        console.log("Nothing to do");
        return
    }

    const [major] = version.split(".");

    const req = request({path: `http://www.byond.com/docs/notes/${major}.html`, host: "localhost", port: 8888}, res => {
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
                    currentbuild = {
                        name: /Build (\d{3}\.\d{4})/.exec(value.text)![1],
                        categories: []
                    }
                    builds.push(currentbuild as build)
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

            data[channel] = version

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
            const embed = {
                username: "BYOND Changelog",
                avatar_url: "https://cdn.discordapp.com/icons/81104451930165248/395762b8f813342035d9db71e3b16f1c.webp",
                content: `BYOND version ${selectedbuild.name} released!`,
                embeds: [
                    {
                        title: `BYOND version ${selectedbuild.name} (${ChannelName[channel]})`,
                        url: "http://www.byond.com/download/",
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: "Generated by https://github.com/yogstation13/byondver"
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
                    const tempfields = [];
                    let currentField = {
                        name: prog.name,
                        value: ""
                    }
                    tempfields.push(currentField);

                    prog.entries.forEach(val => {
                        if(currentField.value.length + val.length > 1000) {
                            currentField = {
                                name: prog.name + " (Continued)",
                                value: ""
                            }
                            tempfields.push(currentField);
                        }

                        currentField.value += "\u25CF " + val + "\n"

                    })
                    fields.push(...tempfields)
                })
            })
            sendMessage(embed)
        })
    });

    req.end();
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

        const work = byondver.split("\n").filter(val => val.length)
        console.log(work)
        work.forEach((val, idx) => doVersion(val, idx === 0 ? Channel.Stable : Channel.Beta))
    })
})
verreq.end()

process.on("beforeExit", () => {
    fs.writeFileSync(path.resolve(__dirname, "../data/data.json"), JSON.stringify(data))
})
