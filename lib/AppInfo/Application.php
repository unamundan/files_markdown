<?php
/**
 * @copyright Copyright (c) 2016, Arthur Schiwon <blizzz@arthur-schiwon.de>
 *
 * @author Arthur Schiwon <blizzz@arthur-schiwon.de>
 * @author Christoph Wurst <christoph@winzerhof-wurst.at>
 * @author Joas Schilling <coding@schilljs.com>
 * @author John Molakvoæ (skjnldsv) <skjnldsv@protonmail.com>
 * @author Roeland Jago Douma <roeland@famdouma.nl>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */

namespace OCA\FilesMarkdown\AppInfo;

use OC\Security\CSP\ContentSecurityPolicy;
use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCP\AppFramework\App;
use OCP\EventDispatcher\IEventDispatcher;
use OCP\Util;

class Application extends App {
	public const APP_ID = 'files_markdown';

	public function __construct(array $urlParams = []) {
		parent::__construct(self::APP_ID, $urlParams);
	}

	public function register() {
		$server = $this->getContainer()->getServer();

		/** @var IEventDispatcher $dispatcher */
		$dispatcher = $server->query(IEventDispatcher::class);

		$dispatcher->addListener(LoadAdditionalScriptsEvent::class, function () use ($server) {
			$policy = new ContentSecurityPolicy();
			$policy->setAllowedImageDomains(['*']);
			$frameDomains = $policy->getAllowedFrameDomains();
			$frameDomains[] = 'www.youtube.com';
			$frameDomains[] = 'prezi.com';
			$frameDomains[] = 'player.vimeo.com';
			$frameDomains[] = 'vine.co';
			$policy->setAllowedFrameDomains($frameDomains);
			$server->getContentSecurityPolicyManager()->addDefaultPolicy($policy);

			//load the required files
			Util::addscript('files_markdown', '../build/editor');
			Util::addStyle('files_markdown', '../build/styles');
			Util::addStyle('files_markdown', 'preview');
		});

		$dispatcher->addListener('OCA\Files_Sharing::loadAdditionalScripts', function () {
			Util::addScript('files_markdown', '../build/editor');
			Util::addStyle('files_markdown', '../build/styles');
			Util::addStyle('files_markdown', 'preview');
		});
	}
}
