# load-data-node

This is a version of the ClinGen LoadData project written in Javascript for Node. This isn’t “canon” — [LoadData](https://github.com/ClinGen/LoadData) is. This is just to help me understand the data we’re dealing with, and to get practice with the [mongoDB](https://www.mongodb.org) node API.

At the moment, it only handles disease data. I’ll add more as I have time and feel the usefulness of doing that.

## Prerequisites

- [Install Node](https://nodejs.org)
- [Install mongoDB](http://docs.mongodb.org/manual/installation/)

## Project setup

- Clone git repo
- Run `npm install`
- Run mongoDB daemon: `mongod`

## Project startup

- Make sure that mongoDB is running, or `mongod`
- Run `./get_disease --help`
