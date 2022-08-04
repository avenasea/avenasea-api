#!/bin/bash

# restore

mongorestore --nsInclude grazily --gzip --archive=dump_grazily__2022-08-02.gz
