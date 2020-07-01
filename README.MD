# Byondver

Small app that polls the byond latest version and posts the changelog to a or more discord webhook when a new version is available

![imagehellodadiamontheinternetnow](https://media.discordapp.net/attachments/484170915253321734/727728020919550012/unknown.png?width=450&height=677)

Persistant files:
data/config.json | holds the webhook urls
data/data.json   | holds the last version posted

The app has to be updated each time theres a new major version, the update is simple, its just changing the link on the second request