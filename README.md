# MMM-VVS
Use this template for creating new MagicMirror² modules.

See the [wiki page](https://github.com/Dennis-Rosenbaum/MMM-Template/wiki) for an in depth overview of how to get started.

# MMM-VVS

*MMM-VVS* is a module for [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) that displays trip information for the Stuttgarter Verkehrsverbund VVS.

## Screenshot

![Example of MMM-VVS](./example_1.png)

## Installation

### Install

In your terminal, go to the modules directory and clone the repository:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/terencejackson8000/MMM-vss.git
npm install
```

### Update

Go to the module directory and pull the latest changes:

```bash
cd ~/MagicMirror/modules/MMM-Template
git pull
```

## Configuration

To use this module, you have to add a configuration object to the modules array in the `config/config.js` file.

### Example configuration

Minimal configuration to use the module:

```js
    {
        module: 'MMM-VVS',
        position: 'lower_third',
        config: {
            requestorRef: "<Your requestor ref>",
            originStopPointRef: "de:08115:5773",
            destinationStopPointRef: "de:08115:5774",
            title: "Ehningen → Gärtringen",
            numberOfResults: 3,
            updateInterval: 60 * 1000
        }
    }
```

### Configuration options

Option|Possible values|Default|Description
------|------|------|-----------
`requestorRef`|`string`|not available|Your requestor reference. Get it as described [here](https://mobidata-bw.de/dataset/trias)
`originStopPointRef`|`string`|not available|The origin stop reference. Check vvs_haltestellen.csv for the references
`destinationStopPointRef`|`string`|not available|The destination stop reference. Check vvs_haltestellen.csv for the references
`title`|`string`|`VVS Trips`|The title for the module to display
`numberOfResults`|`integer`|3|The number of results to be displayed
`updateInterval`|`integer`|60 * 1000|The update interval

## Sending notifications to the module

Notification|Description
------|-----------
`VVS_FETCH`|Payload must contain endpoint, originStopPointRef, destinationStopPointRef, numberOfResults, includeIntermediateStops, requestorRef, departureTime
`VVS_RESULT`|Payload must contain an array of trips
`VVS_ERROR`|Payload must contain an error string

## Developer commands

- `npm install` - Install devDependencies like ESLint.
- `node --run lint` - Run linting and formatter checks.
- `node --run lint:fix` - Fix linting and formatter issues.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## Changelog

All notable changes to this project will be documented in the [CHANGELOG.md](CHANGELOG.md) file.
