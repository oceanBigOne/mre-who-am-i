/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { AttachPoint } from '@microsoft/mixed-reality-extension-sdk';

/**
 * Import the sync-fix module.
 */
import { UserSyncFix } from './sync-fix'

/**
 * The structure of a name entry in the name database.
 */
type NameDescriptor = {
	displayName: string;
	resourceName: string;
	scale: {
		x: number;
		y: number;
		z: number;
	};
	rotation: {
		x: number;
		y: number;
		z: number;
	};
	position: {
		x: number;
		y: number;
		z: number;
	};
	attachPoint: AttachPoint;
};


const allowedCountries: string[] = ["france", "world"];


/**
 * WearAName Application - Showcasing avatar attachments.
 */
export default class WearAName {
	// Container for preloaded name prefabs.
	private hat: MRE.Actor = null;

	private rule1 = new Map<MRE.Guid, MRE.Actor>();
	private rule2 = new Map<MRE.Guid, MRE.Actor>();
	private rule3 = new Map<MRE.Guid, MRE.Actor>();
	private rule4 = new Map<MRE.Guid, MRE.Actor>();
	private ruleTitle = new Map<MRE.Guid, MRE.Actor>();
	private ruleAuthor = new Map<MRE.Guid, MRE.Actor>();

	private btnPlay: MRE.Actor = null;
	private btnInfo: MRE.Actor = null;
	private btnRemove: MRE.Actor = null;
	private assets: MRE.AssetContainer;
	// Container for instantiated names.
	private attachedNames = new Map<MRE.Guid, MRE.Actor>();
	private attachedLabel = new Map<MRE.Guid, MRE.Actor>();
	private country: string;
	private NameDatabase: string[];
	/**
	 * Constructs a new instance of this class.
	 * @param context The MRE SDK context.
	 * @param baseUrl The baseUrl to this project's `./public` folder.
	 */
	//==========================
	// Declare a syncfix attribute to handle the synchronization fixes.
	// In this case, syncfix will call the synchronization functions
	// no more than once every 5000 ms (1 sec).
	//==========================
	private syncfix = new UserSyncFix(5000);

	constructor(private context: MRE.Context, private params: MRE.ParameterSet) {
		this.country = this.params.country as string

		if (this.params.country === undefined) {
			this.country = "world";
		}
		if (allowedCountries.includes(this.country) === false) {
			this.country = "world";
		}
		const uri = '../public/countries/' + this.country + '.json';
		this.NameDatabase = require(uri);

		this.assets = new MRE.AssetContainer(context);
		// Hook the context events we're interested in.
		this.context.onStarted(() => this.started());
		this.context.onUserJoined((user) => this.userJoined(user));
		this.context.onUserLeft(user => this.userLeft(user));

	}

	/**
	 * Synchronization function for attachments
	 * Need to detach and reattach every attachment
	 */
	private synchronizeAttachments() {
		// Loop through all values in the 'attachments' map
		// The [key, value] syntax breaks each entry of the map into its key and
		// value automatically.  In the case of 'attachments', the key is the
		// Guid of the user and the value is the actor/attachment.
		for (const [userId, attachedNames] of this.attachedNames) {
			// Store the current attachpoint.
			const attachPoint = attachedNames.attachment.attachPoint;

			// Detach from the user
			attachedNames.detach();

			// Reattach to the user
			attachedNames.attach(userId, attachPoint);
		}
		for (const [userId, attachedLabel] of this.attachedLabel) {
			// Store the current attachpoint.
			const attachPoint = attachedLabel.attachment.attachPoint;

			// Detach from the user
			attachedLabel.detach();

			// Reattach to the user
			attachedLabel.attach(userId, attachPoint);
		}
	}
	/**
	 * Called when a Names application session starts up.
	 */
	private async started() {
		// Check whether code is running in a debuggable watched filesystem
		// environment and if so delay starting the app by 1 second to give
		// the debugger time to detect that the server has restarted and reconnect.
		// The delay value below is in milliseconds so 1000 is a one second delay.
		// You may need to increase the delay or be able to decrease it depending
		// on the speed of your PC.
		const delay = 1000;
		const argv = process.execArgv.join();
		const isDebug = argv.includes('inspect') || argv.includes('debug');

		// // version to use with non-async code
		// if (isDebug) {
		// 	setTimeout(this.startedImpl, delay);
		// } else {
		// 	this.startedImpl();
		// }

		// version to use with async code
		if (isDebug) {
			await new Promise(resolve => setTimeout(resolve, delay));
			await this.startedImpl();
		} else {
			await this.startedImpl();
		}
		//==========================
		// Set up the synchronization function
		//==========================
		this.syncfix.addSyncFunc(() => this.synchronizeAttachments());
	}

	private startedImpl = async () => {
		await this.showHat();
	}

	private userJoined(user: MRE.User) {
		//==========================
		// Let 'syncfix' know a user has joined.
		//==========================
		this.syncfix.userJoined();
	}

	/**
	 * Called when a user leaves the application (probably left the Altspace world where this app is running).
	 * @param user The user that left the building.
	 */
	private userLeft(user: MRE.User) {
		// If the user was wearing a name, destroy it. Otherwise it would be
		// orphaned in the world.
		this.removeNames(user);
	}


	private showHat = async () => {
		await this.createHat();
		await this.createPlayBtn();
		await this.createRemoveBtn();
		await this.createInfoBtn();


		MRE.Actor.Create(this.context, {
			actor: {
				parentId: this.hat.id,
				name: 'country',
				text: {
					contents: this.country,
					height: 0.06,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 0.7, z: 0.3 },
						rotation: MRE.Quaternion.FromEulerAngles(
							0 * MRE.DegreesToRadians,
							180 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians)
					}
				}
			}
		});

	}
	private async createHat() {

		//get 3D
		const hatData = await this.assets.loadGltf('hat.glb', "mesh");
		// spawn a copy of the glTF model
		this.hat = MRE.Actor.CreateFromPrefab(this.context, {
			// using the data we loaded earlier
			firstPrefabFrom: hatData,
			// Also apply the following generic actor properties.
			actor: {
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				name: 'Hat',
				transform: {
					local: {
						position: { x: 0, y: 0, z: 0 },
						scale: { x: 1, y: 1, z: 1 }
					}
				}
			}
		});

	}

	private async createPlayBtn() {

		//get 3D
		const btnPlayData = await this.assets.loadGltf('btn-play.glb', "mesh");

		this.btnPlay = MRE.Actor.CreateFromPrefab(this.context, {
			firstPrefabFrom: btnPlayData,
			actor: {
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				name: 'btnPlay',
				transform: {
					local: {
						position: { x: 0, y: 0, z: 0 },
						scale: { x: 1, y: 1, z: 1 }
					}
				}
			}
		});

		setTimeout(() => {
			const animBtnPlay = this.btnPlay.targetingAnimationsByName.get("Take 001");
			animBtnPlay.wrapMode = MRE.AnimationWrapMode.Loop;
			animBtnPlay.play();

			//add button behavior
			const buttonPlayBehavior = this.btnPlay.setBehavior(MRE.ButtonBehavior);
			buttonPlayBehavior.onClick(user => this.wearName(user.id));
		}, 1000);

	}

	private async createRemoveBtn() {

		//get 3D
		const btnCloseData = await this.assets.loadGltf('btn-close.glb', "mesh");

		this.btnRemove = MRE.Actor.CreateFromPrefab(this.context, {
			firstPrefabFrom: btnCloseData,
			actor: {
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				name: 'btnPlay',
				transform: {
					local: {
						position: { x: 0, y: 0, z: 0 },
						scale: { x: 1, y: 1, z: 1 }
					}
				}
			}
		});

		setTimeout(() => {
			const animBtnRemove = this.btnRemove.targetingAnimationsByName.get("Take 001");
			animBtnRemove.wrapMode = MRE.AnimationWrapMode.Loop;
			animBtnRemove.play();

			//add button behavior
			const buttonCloseBehavior = this.btnRemove.setBehavior(MRE.ButtonBehavior);
			buttonCloseBehavior.onClick(user => this.removeNames(user));
		}, 1000);

	}

	private async createInfoBtn() {

		//get 3D
		const btnInfoData = await this.assets.loadGltf('btn-info.glb', "mesh");

		this.btnInfo = MRE.Actor.CreateFromPrefab(this.context, {
			firstPrefabFrom: btnInfoData,
			actor: {
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				name: 'btnInfo',
				transform: {
					local: {
						position: { x: 0, y: 0, z: 0 },
						scale: { x: 1, y: 1, z: 1 }
					}
				}
			}
		});

		setTimeout(() => {
			const animBtnInfo = this.btnInfo.targetingAnimationsByName.get("Take 001");
			animBtnInfo.wrapMode = MRE.AnimationWrapMode.Loop;
			animBtnInfo.play();

			//add button behavior
			const buttonInfoBehavior = this.btnInfo.setBehavior(MRE.ButtonBehavior);
			buttonInfoBehavior.onHover('enter', user => this.showRules(user));
			buttonInfoBehavior.onHover('exit', user => this.hideRules(user));

		}, 1000);


	}

	private wearName(userId: MRE.Guid) {

		// If the user is wearing a hat, destroy it.
		this.removeNames(this.context.user(userId));
		const names = this.NameDatabase;
		const name = names[Math.round(Math.random() * names.length)];
		const label3D = MRE.Actor.Create(this.context, {
			actor: {
				name: 'label',
				text: {
					contents: name,
					height: 0.8,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: { r: 255, g: 255, b: 255 },

				},
				transform: {
					local: {
						position: { x: 0, y: 0.2, z: 0.18 },
						rotation: MRE.Quaternion.FromEulerAngles(
							0 * MRE.DegreesToRadians,
							180 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians),
						scale: { x: 0.08, y: 0.08, z: 0.08 }
					}
				},
				attachment: {
					attachPoint: 'head',
					userId

				}
			}
		});
		const blackChars = '???';
		const labelBackground = MRE.Actor.Create(this.context, {
			actor: {
				name: 'label',
				text: {
					contents: blackChars.padStart(name.length, '???'),
					height: 0.8,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: { r: 0, g: 0, b: 0 },

				},
				transform: {
					local: {
						position: { x: 0, y: 0.2, z: 0.15 },
						rotation: MRE.Quaternion.FromEulerAngles(
							0 * MRE.DegreesToRadians,
							180 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians),
						scale: { x: 0.08, y: 0.08, z: 0.08 }
					}
				},
				attachment: {
					attachPoint: 'head',
					userId

				}
			}
		});

		// Create the hat model and attach it to the avatar's head.
		this.attachedNames.set(userId, label3D);
		this.attachedLabel.set(userId, labelBackground);
	}

	private removeNames(user: MRE.User) {
		if (this.attachedNames.has(user.id)) { this.attachedNames.get(user.id).destroy(); }
		this.attachedNames.delete(user.id);
		if (this.attachedLabel.has(user.id)) { this.attachedLabel.get(user.id).destroy(); }
		this.attachedLabel.delete(user.id);
	}

	private hideRules(user: MRE.User) {
		if (this.rule1.has(user.id)) { this.rule1.get(user.id).destroy(); }
		this.rule1.delete(user.id);
		if (this.rule2.has(user.id)) { this.rule2.get(user.id).destroy(); }
		this.rule2.delete(user.id);
		if (this.rule3.has(user.id)) { this.rule3.get(user.id).destroy(); }
		this.rule1.delete(user.id);
		if (this.rule4.has(user.id)) { this.rule4.get(user.id).destroy(); }
		this.rule4.delete(user.id);
		if (this.ruleAuthor.has(user.id)) { this.ruleAuthor.get(user.id).destroy(); }
		this.ruleAuthor.delete(user.id);
		if (this.ruleTitle.has(user.id)) { this.ruleTitle.get(user.id).destroy(); }
		this.ruleTitle.delete(user.id);
	}

	private showRules(user: MRE.User) {
		this.hideRules(user);
		const rule1 = MRE.Actor.Create(this.context, {
			actor: {
				exclusiveToUser: user.id,
				parentId: this.hat.id,
				name: 'rule1',
				text: {
					contents: "Click on the play button to get a random name on your head",
					height: 0.05,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 1.55, z: 0 },
						rotation: MRE.Quaternion.FromEulerAngles(
							0 * MRE.DegreesToRadians,
							180 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians)
					}
				}
			}
		});
		this.rule1.set(user.id, rule1);

		const rule2 = MRE.Actor.Create(this.context, {
			actor: {
				exclusiveToUser: user.id,
				parentId: this.hat.id,
				name: 'rule2',
				text: {
					contents: "Try to guess this name by asking other players, but",
					height: 0.05,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 1.5, z: 0 },
						rotation: MRE.Quaternion.FromEulerAngles(
							0 * MRE.DegreesToRadians,
							180 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians)
					}
				}
			}
		});
		this.rule2.set(user.id, rule2);

		const rule3 = MRE.Actor.Create(this.context, {
			actor: {
				exclusiveToUser: user.id,
				parentId: this.hat.id,
				name: 'rule3',
				text: {
					contents: "questions can only be answered by YES or NO.",
					height: 0.05,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 1.45, z: 0 },
						rotation: MRE.Quaternion.FromEulerAngles(
							0 * MRE.DegreesToRadians,
							180 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians)
					}
				}
			}
		});
		this.rule3.set(user.id, rule3);

		const rule4 = MRE.Actor.Create(this.context, {
			actor: {
				exclusiveToUser: user.id,
				parentId: this.hat.id,
				name: 'rule3',
				text: {
					contents: "This version contains famous " + (this.NameDatabase.length)
						+ " characters known in : " + this.country,
					height: 0.05,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 1.3, z: 0 },
						rotation: MRE.Quaternion.FromEulerAngles(
							0 * MRE.DegreesToRadians,
							180 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians)
					}
				}
			}
		});
		this.rule4.set(user.id, rule4);

		const ruleTitle = MRE.Actor.Create(this.context, {
			actor: {
				exclusiveToUser: user.id,
				parentId: this.hat.id,
				name: 'ruleTitle',
				text: {
					contents: "Who I am ?",
					height: 0.08,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 1.7, z: 0 },
						rotation: MRE.Quaternion.FromEulerAngles(
							0 * MRE.DegreesToRadians,
							180 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians)
					}
				}
			}
		});
		this.ruleTitle.set(user.id, ruleTitle);

		const ruleAuthor = MRE.Actor.Create(this.context, {
			actor: {
				exclusiveToUser: user.id,
				parentId: this.hat.id,
				name: 'ruleTitle',
				text: {
					contents: "By Barbatruc ( thanks to Extremys :) )",
					height: 0.03,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 1.65, z: 0 },
						rotation: MRE.Quaternion.FromEulerAngles(
							0 * MRE.DegreesToRadians,
							180 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians)
					}
				}
			}
		});
		this.ruleAuthor.set(user.id, ruleAuthor);

	}
	/*private toggleRules(user: MRE.User) {
		if (!this.rule1) {
			this.ruleTitle = MRE.Actor.Create(this.context, {
				actor: {
					//	exclusiveToUser: user.id,
					parentId: this.hat.id,
					name: 'ruleTitle',
					text: {
						contents: "Who I am ?",
						height: 0.08,
						anchor: MRE.TextAnchorLocation.MiddleCenter
					},
					transform: {
						local: {
							position: { x: 0, y: 1.7, z: 0 },
							rotation: MRE.Quaternion.FromEulerAngles(
								0 * MRE.DegreesToRadians,
								180 * MRE.DegreesToRadians,
								0 * MRE.DegreesToRadians)
						}
					}
				}
			});
			this.ruleAuthor = MRE.Actor.Create(this.context, {
				actor: {
					//	exclusiveToUser: user.id,
					parentId: this.hat.id,
					name: 'ruleTitle',
					text: {
						contents: "By Barbatruc ( thanks to Extremys :) )",
						height: 0.03,
						anchor: MRE.TextAnchorLocation.MiddleCenter
					},
					transform: {
						local: {
							position: { x: 0, y: 1.65, z: 0 },
							rotation: MRE.Quaternion.FromEulerAngles(
								0 * MRE.DegreesToRadians,
								180 * MRE.DegreesToRadians,
								0 * MRE.DegreesToRadians)
						}
					}
				}
			});
			this.rule1 = MRE.Actor.Create(this.context, {
				actor: {
					//	exclusiveToUser: user.id,
					parentId: this.hat.id,
					name: 'rule1',
					text: {
						contents: "Click on the play button to get a random name on your head",
						height: 0.05,
						anchor: MRE.TextAnchorLocation.MiddleCenter
					},
					transform: {
						local: {
							position: { x: 0, y: 1.55, z: 0 },
							rotation: MRE.Quaternion.FromEulerAngles(
								0 * MRE.DegreesToRadians,
								180 * MRE.DegreesToRadians,
								0 * MRE.DegreesToRadians)
						}
					}
				}
			});
			this.rule2 = MRE.Actor.Create(this.context, {
				actor: {
					//	exclusiveToUser: user.id,
					parentId: this.hat.id,
					name: 'rule2',
					text: {
						contents: "Try to guess this name by asking other players, but",
						height: 0.05,
						anchor: MRE.TextAnchorLocation.MiddleCenter
					},
					transform: {
						local: {
							position: { x: 0, y: 1.5, z: 0 },
							rotation: MRE.Quaternion.FromEulerAngles(
								0 * MRE.DegreesToRadians,
								180 * MRE.DegreesToRadians,
								0 * MRE.DegreesToRadians)
						}
					}
				}
			});
			this.rule3 = MRE.Actor.Create(this.context, {
				actor: {
					//exclusiveToUser: user.id,
					parentId: this.hat.id,
					name: 'rule3',
					text: {
						contents: "questions can only be answered by YES or NO.",
						height: 0.05,
						anchor: MRE.TextAnchorLocation.MiddleCenter
					},
					transform: {
						local: {
							position: { x: 0, y: 1.45, z: 0 },
							rotation: MRE.Quaternion.FromEulerAngles(
								0 * MRE.DegreesToRadians,
								180 * MRE.DegreesToRadians,
								0 * MRE.DegreesToRadians)
						}
					}
				}
			});

			this.rule4 = MRE.Actor.Create(this.context, {
				actor: {
					//exclusiveToUser: user.id,
					parentId: this.hat.id,
					name: 'rule3',
					text: {
						contents: "This version contains famous " + (this.NameDatabase.length)
							+ " characters known in : " + this.country,
						height: 0.05,
						anchor: MRE.TextAnchorLocation.MiddleCenter
					},
					transform: {
						local: {
							position: { x: 0, y: 1.3, z: 0 },
							rotation: MRE.Quaternion.FromEulerAngles(
								0 * MRE.DegreesToRadians,
								180 * MRE.DegreesToRadians,
								0 * MRE.DegreesToRadians)
						}
					}
				}
			});
		} else {
			this.ruleTitle.destroy();
			this.ruleTitle = null;

			this.ruleAuthor.destroy();
			this.ruleAuthor = null;

			this.rule1.destroy();
			this.rule1 = null;

			this.rule2.destroy();
			this.rule2 = null;

			this.rule3.destroy();
			this.rule3 = null;

			this.rule4.destroy();
			this.rule4 = null;
		}

	}*/


}
